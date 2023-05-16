import pandas as pd
import joblib
import sys
from sklearn.preprocessing import LabelEncoder
from sklearn.impute import SimpleImputer


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

def predict_price(model_filename, input_string):
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
    print(f'{predicted_price[0]:.2f}')
    sys.stdout.flush()

def predict_model():
    print("...")


if __name__ == '__main__':
    
    if len(sys.argv) != 3:
        print("Usage: python predict.py <function> <input_string>")
        sys.exit(1)

    price_model = "./models/price_prediction.joblib"
    # model_model = "./models/model_prediction.joblib"

    function = sys.argv[1]
    input_string = sys.argv[2]

    if function == "predict_price":
        predict_price(price_model, input_string)
    elif function == "predict_model":
        predict_model()
