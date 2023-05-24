from flask import Flask, request, jsonify
import difflib
import joblib
import json
import pandas as pd
import os
from sklearn.preprocessing import LabelEncoder
from sklearn.impute import SimpleImputer

script_dir = os.path.dirname(os.path.abspath(__file__))
model_filename = os.path.join(script_dir, "models/price_prediction.joblib")
price_model = joblib.load(model_filename)

manufacturer_filename = os.path.join(script_dir, "models/encoders/manufacturer_encoder.joblib")
manufacturer_encoder = joblib.load(manufacturer_filename)

model_filename = os.path.join(script_dir, "models/encoders/model_encoder.joblib")
model_encoder = joblib.load(model_filename)

condition_filename = os.path.join(script_dir, "models/encoders/condition_encoder.joblib")
condition_encoder = joblib.load(condition_filename)

title_status_filename = os.path.join(script_dir, "models/encoders/title_status_encoder.joblib")
title_status_encoder = joblib.load(title_status_filename)

paint_color_filename = os.path.join(script_dir, "models/encoders/paint_color_encoder.joblib")
paint_color_encoder = joblib.load(paint_color_filename)

imputer_filename = os.path.join(script_dir, "models/imputers/price_imputer.joblib")
imputer = joblib.load(imputer_filename)

valid_inputs_filename = os.path.join(script_dir, "valid_inputs.json")
with open(valid_inputs_filename, 'r') as f:
    valid_inputs = json.load(f)

app = Flask(__name__)


def preprocess_input(data):
    """
    Preprocesses the input data by encoding the categorical data and imputing the missing values
    :param data: The data to be processed
    :return: The processed data
    """
    print(data)
    for column in data.columns:
        # print(column)
        if column in valid_inputs:
            # print(data[column][0])
            # print(difflib.get_close_matches(data[column][0], valid_inputs[column], n=1))
            # data[column][0] = difflib.get_close_matches(data[column][0], valid_inputs[column], n=1)[0]
            close_match = difflib.get_close_matches(data[column][0], valid_inputs[column], n=1)
            data[column][0] = close_match[0] if close_match else float('NaN')

    # Convert year and odometer to numeric values
    data['year'] = pd.to_numeric(data['year'], errors='coerce')
    data['odometer'] = data['odometer'].str.replace('[^0-9]', '', regex=True).astype(float)

    print(data)
    data['manufacturer'] = manufacturer_encoder.transform(data['manufacturer'].astype(str))
    data['model'] = model_encoder.transform(data['model'].astype(str))
    data['condition'] = condition_encoder.transform(data['condition'].astype(str))
    data['title_status'] = title_status_encoder.transform(data['title_status'].astype(str))
    data['paint_color'] = paint_color_encoder.transform(data['paint_color'].astype(str))

    data_i = imputer.fit_transform(data)
    data = pd.DataFrame(data_i, columns=data.columns)
    return data


def predict_price(input_string):
    """
    Uses the model to predict the price of a car
    :param model_filename: The filename of the model
    :param input_string: The input string containing the data to predict the price of a car
    :return: The predicted price of the car
    """
    input_data = pd.DataFrame([input_string.split(",")],
                              columns=['year', 'manufacturer', 'model', 'condition', 'odometer', 'title_status',
                                       'paint_color', 'year_listed', 'month'])
    input_data = preprocess_input(input_data)
    predicted_price = price_model.predict(input_data)
    return predicted_price


@app.route('/')
def home():
    return "Python is running!"


@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    print(data)
    input_string = data['input']

    prediction = predict_price(input_string)

    return jsonify({
        'prediction': prediction[0]
    })


if __name__ == "__main__":
    port = int(os.getenv('PORT', 8080))
    app.run(host='0.0.0.0', port=port)
