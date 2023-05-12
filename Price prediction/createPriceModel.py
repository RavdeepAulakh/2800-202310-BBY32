import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.impute import SimpleImputer
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error

def load_data(file):
    data = pd.read_csv(file)
    return data

def preprocess_data(data):
    data = data.dropna(subset=['posting_date', 'price', 'odometer'])
    data = data.loc[(data['price'] >= 1000) & (data['price'] <= 100000)]
    data = data.loc[(data['odometer'] >= 1000)]
    data['posting_date'] = pd.to_datetime(data['posting_date'], format='%Y-%m-%dT%H:%M:%S%z', utc=True)
    data['year'] = data['posting_date'].dt.year
    data['month'] = data['posting_date'].dt.month
    data = data.drop(columns=['posting_date'])

    encoder = LabelEncoder()
    for col in ['region', 'manufacturer', 'model', 'condition', 'cylinders', 'fuel', 'title_status', 'transmission', 'drive', 'size', 'type', 'paint_color', 'state']:
        data[col] = encoder.fit_transform(data[col].astype(str))

    imputer = SimpleImputer(strategy='mean')
    data = imputer.fit_transform(data)

    return data

def train_model(x, y):
    x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=0.2)
    model = DecisionTreeRegressor()
    model.fit(x_train, y_train)
    return model, x_test, y_test

def evaluate_model(model, x_test, y_test):
    predicted_values = model.predict(x_test)
    results = pd.DataFrame({'Actual': y_test, 'Predicted': predicted_values})
    r2 = r2_score(y_test, predicted_values)
    mae = mean_absolute_error(y_test, predicted_values)
    mse = mean_squared_error(y_test, predicted_values)
    rmse = mean_squared_error(y_test, predicted_values, squared=False)
    return results, r2, mae, mse, rmse

def save_model(model, filename):
    joblib.dump(model, filename)

def main():
    data = load_data('vehicles.csv')
    x = preprocess_data(data.drop(columns=['price', 'id', 'url', 'region_url', 'VIN', 'image_url', 'description', 'county', 'lat', 'long']))
    y = data['price']

    model, x_test, y_test = train_model(x, y)
    results, r2, mae, mse, rmse = evaluate_model(model, x_test, y_test)

    print("\nResults:")
    print(results.head(30))
    print(f'R-squared: {r2:.2f}')
    print(f'Mean Absolute Error: {mae:.2f}')
    print(f'Mean Squared Error: {mse:.2f}')
    print(f'Root Mean Squared Error: {rmse:.2f}')

    # save_model(model, 'price_prediction.joblib')

if __name__ == '__main__':
    main()
