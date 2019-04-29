# Crypto Alerts

## Description

This is meant to be run as scheduled lambda.  It will pull BTC Perpetual index and mark prices.  It will send an SMS message if the index/mark price hits a certain difference, or if the current index price is + or - $50 from the last 4 recorded prices.  Prices are recorded every minute.

The goal is to identify a sudden up or down tick in BTC prices to idenfity opportunities for futures trading.