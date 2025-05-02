import pandas as pd
import mplfinance as mpf

df = pd.read_csv('es-30m-cleaned.csv')

# Select first 100 rows
df_first_100 = df.head(900)  # or df.iloc[:100]

# Now use this for your candlestick chart
df_first_100['datetime'] = pd.to_datetime(df_first_100['datetime'])
df_first_100.set_index('datetime', inplace=True)

mpf.plot(df_first_100, type='candle', style='charles', title='First 1000 Rows', volume=True)

# a = []
# a.append(1)
# a.append(2)
# a.append(3)
# a.append(4)
# a.append(5)
# a.append(6)
# a.pop(0)
# print(a)

# print(bool(5>3))
# print(bool(5>13))