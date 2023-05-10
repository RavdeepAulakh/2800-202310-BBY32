import pandas as pb
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.preprocessing import LabelEncoder


def main():
    data = pb.read_csv('vehicles.csv')
    print("\nData: ")
    print(data)
    # x is the input set, y is the output set
    x = data.drop(columns=['price', 'id', 'url', 'region_url', 'VIN', 'image_url', 'description', 'county', 'lat', 'long'])
    x = pd.get_dummies(x)
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
