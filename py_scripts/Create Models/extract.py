import pandas as pd
import json


data = pd.read_csv('vehicles.csv')
valid_inputs = {}

# Preprocess the data the same way as the training data
data = data.dropna(subset=['posting_date', 'price', 'odometer'])
data = data.loc[(data['price'] >= 1000) & (data['price'] <= 100000)]
data = data.loc[(data['odometer'] >= 1000)]

columns_of_interest = ['year', 'manufacturer', 'model', 'condition', 'title_status', 'paint_color']

for column in columns_of_interest:
    unique_values = data[column].unique().tolist()
    unique_values = list(map(str, unique_values))
    valid_inputs[column] = unique_values

with open('valid_inputs.json', 'w') as f:
    json.dump(valid_inputs, f)
