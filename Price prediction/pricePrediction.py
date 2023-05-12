import pandas as pd
import joblib
from sklearn.preprocessing import LabelEncoder
from sklearn.impute import SimpleImputer
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeRegressor
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error


def preprocess_data(data):
    """
    Preprocesses the data by removing null values, removing outliers,
        and converting the posting_date to year_listed and month
    :param data: The data to processed
    :return: The processed data
    """

    data = data.dropna(subset=['posting_date', 'price', 'odometer'])
    data = data.loc[(data['price'] >= 1000) & (data['price'] <= 100000)]
    data = data.loc[(data['odometer'] >= 1000)]

    data['posting_date'] = pd.to_datetime(data['posting_date'], format='%Y-%m-%dT%H:%M:%S%z', utc=True)
    data['year_listed'] = data['posting_date'].dt.year
    data['month'] = data['posting_date'].dt.month

    # headers = id,url,region,region_url,price,year,manufacturer,model,condition,cylinders,fuel,odometer,title_status,
    #           transmission,VIN,drive,size,type,paint_color,image_url,description,county,state,lat,long,posting_date
    # keep = ['price', 'year', 'manufacturer', 'model', 'condition', 'odometer', 'title_status', 'paint_color',
    #           'year_listed', 'month']
    # drop = ['id', 'url', 'region', 'region_url', 'cylinders', 'fuel', 'transmission', 'VIN', 'drive', 'size', 'type',
    #           'image_url', 'description', 'county', 'state', 'lat', 'long', 'posting_date']
    data = data.drop(
        columns=['id', 'url', 'region', 'region_url', 'cylinders', 'fuel', 'transmission', 'VIN', 'drive', 'size',
                 'type', 'image_url', 'description', 'county', 'state', 'lat', 'long', 'posting_date'])

    encoder = LabelEncoder()
    data['manufacturer'] = encoder.fit_transform(data['manufacturer'].astype(str))
    joblib.dump(encoder, './models/encoders/manufacturer_encoder.joblib')
    data['model'] = encoder.fit_transform(data['model'].astype(str))
    joblib.dump(encoder, './models/encoders/model_encoder.joblib')
    data['condition'] = encoder.fit_transform(data['condition'].astype(str))
    joblib.dump(encoder, './models/encoders/condition_encoder.joblib')
    data['title_status'] = encoder.fit_transform(data['title_status'].astype(str))
    joblib.dump(encoder, './models/encoders/title_status_encoder.joblib')
    data['paint_color'] = encoder.fit_transform(data['paint_color'].astype(str))
    joblib.dump(encoder, './models/encoders/paint_color_encoder.joblib')

    imputer = SimpleImputer(strategy='mean')
    data_i = imputer.fit_transform(data)
    joblib.dump(imputer, './models/imputers/price_imputer.joblib')
    data = pd.DataFrame(data_i, columns=data.columns)
    return data


def preprocess_input(data):
    """
    Preprocesses the input data by encoding the categorical data and imputing the missing values
    :param data: The data to be processed
    :return: The processed data
    """
    manufacturer_encoder = joblib.load('./models/encoders/manufacturer_encoder.joblib')
    model_encoder = joblib.load('./models/encoders/model_encoder.joblib')
    condition_encoder = joblib.load('./models/encoders/condition_encoder.joblib')
    title_status_encoder = joblib.load('./models/encoders/title_status_encoder.joblib')
    paint_color_encoder = joblib.load('./models/encoders/paint_color_encoder.joblib')
    imputer = joblib.load('./models/imputers/price_imputer.joblib')

    data['manufacturer'] = manufacturer_encoder.transform(data['manufacturer'].astype(str))
    data['model'] = model_encoder.transform(data['model'].astype(str))
    data['condition'] = condition_encoder.transform(data['condition'].astype(str))
    data['title_status'] = title_status_encoder.transform(data['title_status'].astype(str))
    data['paint_color'] = paint_color_encoder.transform(data['paint_color'].astype(str))

    data_i = imputer.fit_transform(data)
    data = pd.DataFrame(data_i, columns=data.columns)
    return data


def train_model(data, model_filename):
    """
    Trains the model using the data and saves the model to a file
    :param data: The preprocessed data to train the model with
    :param model_filename: The filename of the model
    """
    x = data.drop(columns=['price'])
    y = data['price']
    x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=0.2)
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
    joblib.dump(model, ("./models/" + model_filename))


def use_model(model_filename, input_string):
    """
    Uses the model to predict the price of a car
    :param model_filename: The filename of the model
    :param input_string: The input string containing the data to predict the price of a car
    :return: The predicted price of the car
    """
    input_data = pd.DataFrame([input_string.split(",")],
                              columns=['year', 'manufacturer', 'model', 'condition', 'odometer', 'title_status',
                                       'paint_color', 'year_listed', 'month'])
    model = joblib.load(model_filename)
    input_data = preprocess_input(input_data)
    predicted_price = model.predict(input_data)
    return predicted_price


def main():
    """
    Run to train the model and save it to a file
    Predicts the price of a car using the model
    """
    # data = pd.read_csv('vehicles.csv')
    # data = preprocess_data(data)
    # train_model(data, 'price_prediction.joblib')
    predicted_price = use_model('./models/price_prediction.joblib',
                                '2020,honda,civic si coupe 2d,excellent,3000,clean,white,2021,1')
    print(f'Predicted price: {predicted_price[0]}')
    predicted_price = use_model('./models/price_prediction.joblib', '2020,ford,f-150,excellent,1000,clean,white,2020,1')
    print(f'Predicted price: {predicted_price[0]}')


if __name__ == '__main__':
    main()
