from typing import List, Optional

import pandas as pd

import matplotlib.pyplot as plt

from backtester.strategy import Strategy


class StrategyBacktester:

    def __init__(self):
        """

        """
        self.strategies: List[Strategy] = []
        self.data: Optional[pd.DataFrame] = None

    def load_strategies(self, strategies: List[Strategy]) -> None:
        """

        :param strategies: an array of strategy objects
        :return:
        """
        self.strategies = strategies

    def load_strategy(self, strategy: Strategy) -> None:
        """

        :param strategy: A single strategy
        :return:
        """
        self.strategies.append(strategy)

    def load_backtest_data(self, df: pd.DataFrame) -> None:
        """

        :param df: our backtest data
        :return:
        """
        self.data = df

    def run_backtest(self) -> None:

        """
        Runs a backtest and outputs the stats
        :return:
        """
        last_price = None
        # Backtest Strategy
        for index, row in self.data.iterrows():
            price = row['close']  # update current price
            high_price = row['high']

            if last_price is None:  # cant trade without a valid last price
                last_price = price
                continue
            for strategy in self.strategies:
                # pass the relevant price information
                strategy.update(index, price, last_price, high_price)

            # update
            last_price = price  # update previous price

        #
        #
        #
        #         max_open_trades = strategy.calculate_max_open_trades(price)
        #         # print(max_open_trades)
        #         if max_open_trades > 0:
        #             for level in strategy.static_levels:
        #                 entry_offset = strategy.entry_offset
        #                 if price <= level < last_price:  # Retrace level
        #                     print(f"DEBUG: {strategy.name}: Price retraced to level {level}.")
        #
        #                     if level in strategy.traded_levels:  # If we've traded this level already
        #                         if abs(strategy.traded_levels[level] - price) >= strategy.re_entry_distance:
        #                             # Allow re-entry at this level
        #                             del strategy.traded_levels[level]  # Reset re-entry condition for this level
        #                         else:
        #                             print(
        #                                 f"DEBUG: {strategy.name}: Level {level} already traded, re-entry condition not met.")
        #                             continue  # Skip this level, as re-entry condition is not met
        #
        #                     # check if we can enter here (offset above entry level)
        #                     if price + entry_offset <= level:
        #                         while max_open_trades > 0:
        #                             # keep sending orders until we cant
        #                             # otherwise enter trade at this level
        #                             # check our cash, we might have it all tied up in other trades
        #                             # if current_cash_value - price * 0.1 * 4 * 12.5 < 0:
        #                             #     print(f"DEBUG: Don't have enough cash in account to enter new trades.")
        #                             #     entry_price = price
        #                             #     break
        #
        #                             entry_price = price
        #                             stop_level = level - strategy.stop_loss_offset
        #                             trailing_stop = None
        #                             strategy.position = 'long'
        #                             strategy.trade_history.append(
        #                                 (index, 'BUY', price,
        #                                  0))  # pnl for buy trade is $0 since we haven't locked in any pnl yet
        #
        #                             strategy.traded_levels[level] = price
        #
        #                             trade = [index, entry_price, stop_level, trailing_stop,
        #                                      level]  # store our open trades
        #                             strategy.open_trade_list.append(trade)
        #                             strategy.open_trade_count += 1
        #                             strategy.current_cash_value -= entry_price * 0.1 * 4 * 12.5
        #
        #                             print(
        #                                 f"{strategy.name}: [{index}] BUY ORDER SENT at {entry_price} (Retraced to static level {level})")
        #                             print(f"{strategy.name}:    Stop-Loss Level: {stop_level}")
        #                             max_open_trades -= 1
        #         else:
        #             # print(f"DEBUG: Don't have enough cash in account to enter new trades.")
        #             print(
        #                 f"DEBUG: {strategy.name}: Available cash: ${strategy.current_cash_value:.2f}. Need ${price * 0.1 * 4 * 12.5:.2f} to enter new trades.")
        #         if strategy.open_trade_count > 0:
        #             trades_to_remove = []
        #             for i in range(len(strategy.open_trade_list)):
        #                 trade_time, entry_price, stop_level, trailing_stop, traded_level = strategy.open_trade_list[i]
        #                 if trailing_stop is None:
        #                     # Check if price has moved 2 levels above entry
        #                     index_of_level = strategy.static_levels.index(
        #                         traded_level)  # find the level we triggered on
        #                     if len(strategy.static_levels) - 2 < index_of_level:  # we have no more levels to check so have to invalidate this trade #TODO: something smarter?
        #                         # del trade_history[-1]  # remove trade since we have no way to trigger a stop
        #                         raise ("ERROR ")  # hopefully this never happens but if it does, break until we fix this
        #                         break
        #
        #                     trigger_price = strategy.static_levels[
        #                         index_of_level + strategy.trail_trigger]  # find the price 2 levels up
        #                     if price >= trigger_price:
        #                         print(f"{strategy.name}: [{index}] Trailing stop activated for long position")
        #                         trailing_stop = trigger_price
        #                         strategy.open_trade_list[i][3] = trailing_stop  # update our trailing stop
        #
        #                 if trailing_stop is not None:
        #                     # we take the closest price to the high of the day thats below it
        #                     highest_static_level = sorted([x for x in strategy.static_levels if x < high_price])[
        #                         -1]  # get highest value
        #                     trailing_stop = max(trailing_stop, highest_static_level)  # use high
        #                     strategy.open_trade_list[i][3] = trailing_stop  # update trailing stop
        #
        #                 if price <= stop_level or (trailing_stop is not None and price <= trailing_stop):
        #                     # trade_history.append((index, 'SELL', price))
        #
        #                     pnl = (price - entry_price) * 50  # mult be size
        #                     strategy.current_cash_value += pnl
        #                     # add tied up margin to the current cash
        #                     strategy.current_cash_value += entry_price * 0.1 * 4 * 12.5
        #                     strategy.total_pnl += pnl
        #                     strategy.trade_history.append((index, 'SELL', price, pnl))
        #                     strategy.cumulative_pnl.append(strategy.total_pnl)
        #
        #                     # clean up open trades
        #                     strategy.open_trade_count -= 1
        #                     trades_to_remove.append([trade_time, entry_price, stop_level, trailing_stop, traded_level])
        #
        #                     print(
        #                         f"[{index}] SELL ORDER EXECUTED at {price} (stop level hit {stop_level} or trailing stop hit at {trailing_stop})\n"
        #                         f"\t\t Profit/Loss: {pnl:.2f}")
        #                     print(f"    Entry Price: {entry_price}")
        #                     print(f"    Exit Price: {price}")
        #                     print(
        #                         f"    Trade Duration: {index - trade_time}")  # last two trades are our entry and exit
        #
        #             for trade in trades_to_remove:
        #                 del strategy.open_trade_list[strategy.open_trade_list.index(trade)]  # remove the open trade
        #     last_price = price  # update previous price
        #
        # # close any remaining
        #
        # # Print Trade Summary
        # # for trade in trade_history:
        # #     print(f"{trade[0]}: {trade[1]} at {trade[2]}, PnL: {trade[3] if len(trade) > 2 else 'N/A'}")
        #
        # for strategy in self.strategies:
        #     print(f"Total Pnl for {strategy.name}: ${strategy.total_pnl}")
        #
        #     # Trade Statistics
        #     wins = [trade[3] for trade in strategy.trade_history if trade[1] == 'SELL' and trade[3] > 0]
        #     losses = [trade[3] for trade in strategy.trade_history if trade[1] == 'SELL' and trade[3] <= 0]
        #     win_percentage = len(wins) / max(1, (len(wins) + len(losses))) * 100
        #     lose_percentage = len(losses) / max(1, (len(wins) + len(losses))) * 100
        #     biggest_winner = max(wins, default=0)
        #     biggest_loser = min(losses, default=0)
        #     average_winner = sum(wins) / max(1, len(wins))
        #     average_loser = sum(losses) / max(1, len(losses))
        #
        #     print(f"\n{strategy.name} | Trade Statistics:")
        #     print(f"Win %: {win_percentage:.2f}%, Lose %: {lose_percentage:.2f}%")
        #     print(f"Biggest Winner: {biggest_winner:.2f}")
        #     print(f"Biggest Loser: {biggest_loser:.2f}")
        #     print(f"Average Winner: {average_winner:.2f}")
        #     print(f"Average Loser: {average_loser:.2f}")
        #     print(f"Total PnL: {strategy.total_pnl:.2f}")
        #
        #     # Plot Price and Trade Entries
        #     plt.figure(figsize=(10, 5))
        #     plt.plot(self.data.index, self.data['close'], label='Price')
        #     for trade in strategy.trade_history:
        #         color = 'g' if trade[1] == 'BUY' else 'r'
        #         plt.scatter(trade[0], trade[2], color=color)
        #     plt.legend()
        #     plt.title(f"Price and Trade Entries for {strategy.name}")
        #     plt.show()
        #
        #     # Plot Cumulative PnL
        #     plt.figure(figsize=(10, 5))
        #     plt.plot([x[0] for x in strategy.trade_history if x[1] == 'SELL'], strategy.cumulative_pnl,
        #              label='Cumulative PnL', color='b')
        #     plt.legend()
        #     plt.title(f"Cumulative PnL for {strategy.name}")
        #     plt.show()

    def plot_backtest_results(self):
        for strategy in self.strategies:
            strategy.print_trade_stats()
            strategy.plot_trades(self.data)
