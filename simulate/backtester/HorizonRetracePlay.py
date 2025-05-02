from datetime import datetime
from typing import List
from matplotlib import pyplot as plt

class Strateg:
  def __init__(self, name:str, entry_offset, stop_loss_offset, trail_trigger, re_entry_distance, 
                max_open_trades, max_contracts_per_trade, long_dates, short_dates, num_sma_candles):
    """
    :param entry_offset: offset above signal to enter trade
    :param stop_loss_offset: Offset, in ticks, that we stop ourselves out
    :param trail_trigger: Number of static levels before we trigger our trailing stop
    :param re_entry_distance: Distance beyond the retracement before we will re-enter our trade
    :param starting_cash_value: Initial cash available to this strategy
    :param max_open_trades: Maximum number of trades we can hold at any time
    
    """
    # init strategy values
    self.is_trading = True
    self.name = name
    self.static_levels = None
    self.entry_offset = entry_offset
    self.stop_loss_offset = stop_loss_offset / 4  # convert to ticks
    self.trail_trigger = trail_trigger
    self.re_entry_distance = re_entry_distance
    self.max_open_trades = max_open_trades
    self.max_contracts_per_trade = max_contracts_per_trade
    self.num_sma_candles = num_sma_candles  # should be even number
    
    # init stat data structs
    self.position = None
    self.entry_price = None
    self.stop_level = None
    self.trailing_stop = None
    self.trade_history = []
    self.traded_levels = {}
    self.current_cash_value = 0
    self.open_trade_count = 0
    self.open_trade_list = []
    
    # other misc stats
    self.total_pnl = 0
    self.cumulative_pnl = []
    
    # current market state
    self.price = None
    self.last_price = None
    self.high_price = None
    self.index = None
    self.sma_candles = []   # [{o, h, l, c}, {o, h, l, c}, ...]
    self.half_sma_candles = []
    
    # daterange stuff
    self.long_dates = long_dates
    self.short_dates = short_dates

  def is_up_trending(self) -> bool:
    if len(self.sma_candles) is not self.num_sma_candles:
      print(f'Warning: Need {self.num_sma_candles} candles (has {len(self.sma_candles)})')
      raise ("ERROR ")
    else:
      sma = sum(next(iter(candle)) for candle in self.sma_candles)/self.num_sma_candles
      half_sma = sum(next(iter(candle)) for candle in self.half_sma_candles)/self.num_sma_candles*2
      return bool(half_sma > sma)  # True for upward Trending
    
  def load_static_levels(self, static_levels: List[int]):
    """
    :param static_levels: List of static levels
    :return: None, assigns our static levels for this strategy. Separate to init as we may want to have custom
    static level parsing
    """
    overwrite = False
    if self.static_levels is not None:
      overwrite = bool(input("You already have static levels loaded. Do you want to overwrite? Type True to overwrite or False to ignore "))
    if not overwrite:
      self.static_levels = sorted(static_levels)
      
  def calculate_max_open_trades(self, price: float):
    """
    How our strategy sets risk
    :param price:
    :return:
    """
    # tick size is $12.50 per tick
    # margin is about 10% reounded up
    # margin_per_contract = 0.05 * 12.5 * 4 * price
    # max_open_trades = math.floor(self.current_cash_value / margin_per_contract)
    # return min(max_open_trades, self.max_open_trades)
    return self.max_open_trades - self.open_trade_count
  
  # TODO: make trading logic attach here instead of backtester
  
  def turn_off_trading(self):
    self.is_trading = False
  
  def run_buy_strategy(self):
    #need valid data
    max_open_trades = self.calculate_max_open_trades(self.price)
    print(max_open_trades)
    if(max_open_trades > 0): # can trade
      if self.is_up_trending(): # can open long trade
        
      pass
    else:
      print(f"DEBUG: {self.name}: Open trade = {self.open_trade_count}, max open trades = {self.max_open_trades}. No room left to trade. Skipping")
    if self.open_trade_count > 0: # 🧨
      trades_to_remove = []
      for i in range(len(self.open_trade_list)):
        trade_time, entry_price, stop_level, trailing_stop, traded_level = self.open_trade_list[i]
        if trailing_stop is None:
          index_of_level = self.static_levels.index(traded_level)
          if len(self.static_levels) - 2 < index_of_level:
            raise ("ERROR ")
  
  def update(self, index:datetime, open_price:float, high_price:float, low_price:float, close_price:float):
    # check if prices are valid
    if None in [open_price, high_price, low_price, close_price]:
      raise ValueError(f"Invalid data -> {open_price}, {high_price}, {low_price}, {close_price}")
    else:
      self.last_price = self.sma_candles[self.num_sma_candles-1]
      self.price = close_price
      self.high_price = high_price
      self.index = index
      self.sma_candles.append({index, open_price, high_price, low_price, close_price})
      if len(self.sma_candles) > self.num_sma_candles:
        self.sma_candles.pop(0)
      if index in self.long_dates:
        self.run_buy_strategy()
      elif index in self.short_dates:
        self.run_sell_strategy()  # TODO implement
  
  def print_trade_stats(self):
    # Print Trade Summary
    # for trade in trade_history:
    #     print(f"{trade[0]}: {trade[1]} at {trade[2]}, PnL: {trade[3] if len(trade) > 2 else 'N/A'}")
    print(f"Total Pnl for {self.name}: ${self.total_pnl}")
    
    # Trade Statistics
    wins   = [trade[3] for trade in self.trade_history if trade[1] == 'SELL' and trade[3] > 0]
    losses = [trade[3] for trade in self.trade_history if trade[1] == 'SELL' and trade[3] <= 0]
    win_percentage  = len(wins) / max(1, (len(wins) + len(losses))) * 100
    lose_percentage = len(losses) / max(1, (len(wins) + len(losses))) * 100
    biggest_winner  = max(wins, default=0)
    biggest_loser   = min(losses, default=0)
    average_winner  = sum(wins) / max(1, len(wins))
    average_loser   = sum(losses) / max(1, len(losses))
    
    print(f"\n{self.name} | Trade Statistics:")
    print(f"Win %: {win_percentage:.2f}%, Lose %: {lose_percentage:.2f}%")
    print(f"Biggest Winner: {biggest_winner:.2f}")
    print(f"Biggest Loser: {biggest_loser:.2f}")
    print(f"Average Winner: {average_winner:.2f}")
    print(f"Average Loser: {average_loser:.2f}")
    print(f"Total PnL: {self.total_pnl:.2f}")