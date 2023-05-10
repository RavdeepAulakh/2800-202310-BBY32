import pandas as pb
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.impute import SimpleImputer


def main():
    data = pb.read_csv('vehicles.csv')
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
    x['posting_date'] = encoder.fit_transform(x['posting_date'].astype(str))
    imputer = SimpleImputer(strategy='mean')
    x = imputer.fit_transform(x)
    y = data['price']

    print("\nX: ")
    print(x)
    print("\nY: ")
    print(y)

    x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=0.2)
    model = LinearRegression()
    model.fit(x_train, y_train)

    predicted_values = model.predict(x_test)
    print("\n\nPredicted Values: ")
    print(predicted_values)
    print(y_test)
    print(x_test)


if __name__ == '__main__':
    main()
