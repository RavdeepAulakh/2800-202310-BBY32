import pandas as pd
import joblib
from sklearn.preprocessing import LabelEncoder
from sklearn.impute import SimpleImputer
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeRegressor
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error

def preprocess_data(data):
    encoder = LabelEncoder()
    for column in data.columns:
        if data[column].dtype == type(object):
            data[column] = encoder.fit_transform(data[column].astype(str))
    imputer = SimpleImputer(strategy='mean')
    data = imputer.fit_transform(data)
    return data

def train_model(data, model_filename):
    x = data.drop(columns=['price'])
    y = data['price']
    x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=0.05)
    model = DecisionTreeRegressor()
    model.fit(x_train, y_train)
    predicted_values = model.predict(x_test)
    results = pd.DataFrame({'Actual': y_test, 'Predicted': predicted_values})
    print("\nResults:")
    print(results.head(30))
    r2 = r2_score(y_test, predicted_values)
    mae = mean_absolute_error(y_test, predicted_values)
    mse = mean_squared_error(y_test, predicted_values)
    rmse = mean_squared_error(y_test, predicted_values, squared=False)
    print(f'R-squared: {r2:.2f}')
    print(f'Mean Absolute Error: {mae:.2f}')
    print(f'Mean Squared Error: {mse:.2f}')
    print(f'Root Mean Squared Error: {rmse:.2f}')
    # joblib.dump(model, model_filename)

def use_model(model_filename, input_string):
    input_data = pd.DataFrame([input_string.split(",")], columns=['region','manufacturer','model','condition','cylinders','fuel','odometer','title_status','transmission','drive','size','type','paint_color','state','year','month'])
    model = joblib.load(model_filename)
    input_data = preprocess_data(input_data)
    predicted_price = model.predict(input_data)
    return predicted_price

def main():
    # data = pd.read_csv('vehicles.csv')
    # data = preprocess_data(data)
    # train_model(data, 'price_prediction.joblib')
    predicted_price = use_model('./models/price_prediction.joblib', 'auburn,ford,f-150 xlt,excellent,6 cylinders,gas,clean,automatic,rwd,full-size,truck,black,al,2017,5,128000')
    print(f'Predicted price: {predicted_price[0]}')

if __name__ == '__main__':
    main()
