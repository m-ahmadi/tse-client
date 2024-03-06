from os import system
from io import StringIO
from decimal import Decimal, ROUND_HALF_EVEN
import pandas as pd

# specify the symbol and price adjustment type
sym = 'فولاد'
adj_type = 1

# get the non-adjusted prices (also refered to in this file as `raw`)
# the adjustment operation is performed on this data
# we must also use the `-w` flag which gives us the `adjust-info.json` file
# this file is necessary for the adjustment operation
system(f'tse {sym} -w')
# also get internally adjusted prices
# this acts as the reference to which we will compare the constructed data later
system(f'tse {sym} -j {adj_type}')


# read raw prices as a string to perform some checks
with open(sym+'.csv', encoding='utf-8-sig') as f:
	raw = f.read()

# make sure file is not empty
# this isn't necessary as long as the symbol you choose has some data
if raw == '':
	exit()

# guard against merged file
# this isn't necessary unless using the `-u` flag
if raw == 'merged':
	exit()

# parse adjust info
adjust_info = pd.read_json('adjust-info.json')[sym]

# set up two groups of column names
# this is because they have different decimal places in the original code
# also set up their combination (because it is used multiple times)
k1 = ['open', 'last', 'close']
k2 = ['high', 'low']
k_all = [*k1, *k2]

# parse the raw prices with specified columns parsed as Decimal
prices = pd.read_csv(StringIO(raw), converters={k: Decimal for k in k_all})

# guard against a symbol with empty price data
if len(prices['date']) == 0:
	exit()

# guard against a symbol that is not fit for price adjustment
if adjust_info['validGPLRatio'] == False:
	exit()

# construct the coefficient number for each event
events = adjust_info['events']
if adj_type == 1:
	coef = Decimal('1.0')
	for event in events:
		coef = coef * Decimal(event['priceAfterEvent']) / Decimal(event['priceBeforeEvent'])
		event['coef'] = coef
elif adj_type == 2:
	events = list(filter(lambda i: i['type'] == 'capital increase', events))
	coef = Decimal('1.0')
	for event in events:
		coef = coef * Decimal(event['oldShares']) / Decimal(event['newShares'])
		event['coef'] = coef

# sort events oldest to newest
events.sort(key=lambda i: i['date'])

# add extra event that matches any day after the last event
# this event is needed due to the structure of adjustment algorithm below
infinity_like_integer = '90240101'
events = [ *events, {'date': infinity_like_integer, 'coef': Decimal('1.0')} ]

# keep the last row separated
# no need to process the last row because the original code does not either
last_row = prices.tail(1)
prices = prices.iloc[0:-1]

# construct a coefficient number for each day of prices
get_event_info = lambda j: [events[j], int(events[j]['date']), events[j]['coef']]
j = 0
event, event_date, coef = get_event_info(j)
coefs = [coef]
tot = len(prices['date'])
for i in range(tot-1):
	price_date = int(prices['date'][i])
	shifted = False
	while price_date > event_date:
		j += 1
		event, event_date, coef = get_event_info(j)
		shifted = True
	if shifted:
		coefs[-1] = coef
	coefs.append(coef)

# perform the actual adjustment by multiplying prices and coefficients
for k in k_all:
	prices[k] = prices[k] * coefs


# format decimal places of the numbers

# define the custom rounding function (aka "Banker's Round")
def he_round(n, dp):
	_dp = str(float('1e-'+str(dp))) if dp > 0 else '1'
	n = Decimal(n).quantize(Decimal(_dp), rounding=ROUND_HALF_EVEN)
	return f'{n:.{dp}f}'

# define a simple string formatter function as well
fmt2 = lambda i: f'{i:.2f}'

# apply the decimal formatting for the previously mentioned two groups of columns
for k in k1:
	prices[k] = prices[k].apply(he_round, args=[2])
for k in k2:
	prices[k] = prices[k].apply(he_round, args=[0])
	# apply the same formatting to the last row as the original code
	last_row[k] = last_row[k].apply(fmt2)

# add the separated last row back intact
prices = pd.concat([prices, last_row])

# write output file
outfile = sym + '-تعدیل-دستی.csv'
prices.to_csv(outfile, index=False, lineterminator='\n', float_format=fmt2)

# compare constructed file with the original
adj_postfix_by_type = {1: '-ت', 2: '-ا'}
adj_internal = pd.read_csv(sym + adj_postfix_by_type[adj_type] + '.csv')
adj_external = pd.read_csv(outfile)
orig, copy = adj_internal, adj_external
print('Does constructed data equals the original?', '✅' if copy.equals(orig) else '❌', '\n')
neqlen = orig.compare(copy).shape[0]

# if there are differences, print a report on non-equal items
if neqlen > 0:
	print('Total number of non-equal items?', neqlen, '\n')

	print('How many non-equal items in each column:')
	neq_idxs = {}
	for k in [*k1,*k2]:
		r = copy[k] == orig[k]
		neqs = r[r == False]
		neq_idxs[k] = neqs.index.to_list()
		print(k+':\t', neqs.shape[0])
