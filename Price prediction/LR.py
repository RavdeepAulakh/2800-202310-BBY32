import joblib
import pandas as pb
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.tree import DecisionTreeRegressor, DecisionTreeClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.impute import SimpleImputer
from datetime import datetime
from sklearn.metrics import accuracy_score
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error


def main():
    # headers = id,url,region,region_url,price,year,manufacturer,model,condition,cylinders,fuel,odometer,title_status,transmission,VIN,drive,size,type,paint_color,image_url,description,county,state,lat,long,posting_date
    # used headers = region,year,manufacturer,model,condition,cylinders,fuel,odometer,title_status,transmission,drive,size,type,paint_color,state,posting_date
    data = pb.read_csv('vehicles.csv')
    data = data.dropna(subset=['posting_date', 'price', 'odometer'])
    data = data.loc[(data['price'] >= 1000) & (data['price'] <= 100000)]
    data = data.loc[(data['odometer'] >= 1000)]
    data['posting_date'] = pb.to_datetime(data['posting_date'], format='%Y-%m-%dT%H:%M:%S%z', utc=True)
    data['year'] = data['posting_date'].dt.year
    data['month'] = data['posting_date'].dt.month
    data = data.drop(columns=['posting_date'])
    print("\nData: ")
    print(data)
    # x is the input set, y is the output set
    x = data.drop(columns=['price', 'id', 'url', 'region_url', 'VIN', 'image_url', 'description', 'county', 'lat', 'long'])
    encoder = LabelEncoder()
    x['region'] = encoder.fit_transform(x['region'].astype(str))
    x['manufacturer'] = encoder.fit_transform(x['manufacturer'].astype(str))
    x['model'] = encoder.fit_transform(x['model'].astype(str))
    x['condition'] = encoder.fit_transform(x['condition'].astype(str))
    x['cylinders'] = encoder.fit_transform(x['cylinders'].astype(str))
    x['fuel'] = encoder.fit_transform(x['fuel'].astype(str))
    x['title_status'] = encoder.fit_transform(x['title_status'].astype(str))
    x['transmission'] = encoder.fit_transform(x['transmission'].astype(str))
    x['drive'] = encoder.fit_transform(x['drive'].astype(str))
    x['size'] = encoder.fit_transform(x['size'].astype(str))
    x['type'] = encoder.fit_transform(x['type'].astype(str))
    x['paint_color'] = encoder.fit_transform(x['paint_color'].astype(str))
    x['state'] = encoder.fit_transform(x['state'].astype(str))

    # x['posting_date'] = encoder.fit_transform(x['posting_date'].astype(str))
    # print("\nDebug:")
    # print(x['posting_date'].head())  # before conversion
    # x['posting_date'] = pd.to_datetime(x['posting_date'], format='%Y-%m-%dT%H:%M:%S%z', utc=True)
    # print(x['posting_date'].head())  # after conversion
    # x['year'] = x['posting_date'].dt.year
    # x = x.drop(columns=['posting_date'])
    imputer = SimpleImputer(strategy='mean')
    x = imputer.fit_transform(x)
    y = data['price']

    print("\nX: ")
    print(x)
    print("\nY: ")
    print(y)

    x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=0.2)
    model = DecisionTreeRegressor()
    model.fit(x_train, y_train)

    predicted_values = model.predict(x_test)
    # print("\n\nPredicted Values: ")
    # print(predicted_values)
    # print(y_test)
    # print(x_test)

    results = pd.DataFrame({'Actual': y_test, 'Predicted': predicted_values})
    print("\nResults:")
    print(results.head(30))

    # score = accuracy_score(y_test, predicted_values)
    # print("\nAccuracy Score: ", score)
    r2 = r2_score(y_test, predicted_values)
    mae = mean_absolute_error(y_test, predicted_values)
    mse = mean_squared_error(y_test, predicted_values)
    rmse = mean_squared_error(y_test, predicted_values, squared=False)
    print(f'R-squared: {r2:.2f}')
    print(f'Mean Absolute Error: {mae:.2f}')
    print(f'Mean Squared Error: {mse:.2f}')
    print(f'Root Mean Squared Error: {rmse:.2f}')

    # joblib.dump(model, 'price_prediction.joblib')


if __name__ == '__main__':
    main()
