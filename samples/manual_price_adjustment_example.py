from os import system
from io import StringIO
from decimal import getcontext, Decimal, ROUND_HALF_EVEN
import pandas as pd

# Set default precision and rounding mode for the `decimal` module.
# This is necessary if you want to have the exact same numbers as the internally
# adjusted data.
getcontext().prec = 40
getcontext().rounding = ROUND_HALF_EVEN

# Specify the symbol and price adjustment type.
sym = 'فولاد'
adj_type = 1

# Specify the `--price-columns` option for the `tse` CLI.
# Note that by default the `yesterday` column (10) is not selected.
price_cols_opt = '0,2,3,4,5,6,7,8,9,10'

# Get non-adjusted prices. The adjustment operation is performed on this data.
# The `-t` flag must be used in order to have an identical adjustment operation
# to the internal code.
# We must also use the `-w` flag which provides the `adjust-info.json` file
# which contains the information necessary for the adjustment operation.
system(f'tse {sym} {price_cols_opt} -t -w')

# Get internally adjusted prices as well. This acts as the reference to which we
# will compare the constructed data later on.
system(f'tse {sym} {price_cols_opt} -t -j {adj_type}')

# Get extra information about all symbols to detect if a symbol is an index.
symfile = 'syms.json'
system(f'tse i -F "R" --cols "Symbol,YMarNSC" --json > {symfile}')
symdf = pd.read_json(symfile)
marketcode_by_sym = pd.Series(symdf.YMarNSC.values, index=symdf.Symbol)

# Skip operation if symbol is an index.
if marketcode_by_sym[sym] == 'ID':
	exit()

# Read raw prices as a string to perform some checks.
rawfile = sym + '.csv'
with open(rawfile, encoding='utf-8-sig') as f:
	raw = f.read()

# Make sure file is not empty.
# This isn't necessary as long as the symbol you choose has some data.
if raw == '':
	exit()

# Guard against a merged file.
# This isn't necessary unless the `-u` flag has been used when calling the `tse`
# CLI to get the price data.
if raw == 'merged':
	exit()

# Read and parse the adjustment information file.
nfo = pd.read_json('adjust-info.json')
adjust_info = nfo[sym]

# Set up two groups of price column names.
# This is because they have different decimal places in the internal code.
# Also set up their combination. (because it is used multiple times)
cols_price_dp2 = ['open', 'last', 'close']
cols_price_dp0 = ['high', 'low', 'yesterday']
cols_price_all = [*cols_price_dp2, *cols_price_dp0]

# Set up a group of column names for non-price columns.
# These columns should not go through any process as they are not price columns.
# All other columns of `tse ls -A` beside the ones specified in `cols_price_all`
# belong to this group. Note that depending on the value of `price_cols_opt`,
# you have to modify the columns in this group. The remaining columns that are
# not mentioned here are: ['symbol', 'name', 'namelatin', 'companycode']
cols_nonprice = ['date', 'vol', 'count', 'value']

# Parse the raw prices.
# Parse price columns as `Decimal` and the rest as string.
dtype = {k: 'string' for k in cols_nonprice}
converters = {k: Decimal for k in cols_price_all}
raw = pd.read_csv(StringIO(raw), dtype=dtype, converters=converters)

# Guard against a symbol with empty price data.
if len(raw['date']) == 0:
	exit()

# Guard against a symbol that is not fit for price adjustment.
# "GPLRatio" is an abbreviation for "GapsPerLifespanRatio", which is determined
# by looking at how many "gaps" a symbol has in relation to its lifespan.
# A "gap" is where trading in a symbol is paused and resumed.
if adjust_info['validGPLRatio'] == False:
	exit()

# Construct the coefficient number for each event.
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

# Sort events oldest to newest.
events.sort(key=lambda i: i['date'])

# Add an extra event that matches any day after the last event.
# This event is needed due to the structure of the adjustment algorithm below.
infinity_like_date = '90240101'
events = [ *events, {'date': infinity_like_date, 'coef': Decimal('1.0')} ]

# Make a copy of the data (useful for debugging purposes) and rename it to a
# more appropriate name for this section of the code.
prices = raw.copy()

# Construct a coefficient number for each day of prices.
get_event_info = lambda j: [events[j], int(events[j]['date']), events[j]['coef']]
j = 0
event, event_date, coef = get_event_info(j)
coefs = [coef]
tot = len(prices['date'])
for i in range(tot - 1):
	price_date = int(prices['date'][i])
	shifted = False
	while price_date > event_date:
		j += 1
		event, event_date, coef = get_event_info(j)
		shifted = True
	if shifted:
		coefs[-1] = coef
	coefs.append(coef)

# Perform the actual adjustment by multiplying prices and coefficients.
for k in cols_price_all:
	prices[k] = prices[k] * coefs

# Format decimal places of the numbers.
# Define a custom rounding function (aka "Banker's Round").
def he_round(n, dp):
	exp = Decimal('10') ** -dp
	n = Decimal(n).quantize(exp, rounding=ROUND_HALF_EVEN)
	return f'{n:.{dp}f}'
# Apply decimal formatting for the aforementioned groups of price columns.
for k in cols_price_dp2:
	prices[k] = prices[k].apply(he_round, args=[2])
for k in cols_price_dp0:
	prices[k] = prices[k].apply(he_round, args=[0])

# Get the intact last row to be replaced with the adjusted last row.
# There is no need to adjust the row (same as the internal code).
# The reason for not using the already loaded data in the variable `prices` is
# that its `DataFrame` has been loaded with some columns parsed as something
# other than string and since that can affect the decimal places of the numbers,
# we cannot use that `DataFrame`, therefore we must read the raw prices again
# but this time with every column set to be parsed as string.
intact_last_row = pd.read_csv(rawfile, dtype='string').tail(1)

# Replace the adjusted last row with the unmodified version.
prices = pd.concat([prices.iloc[0:-1], intact_last_row])

# Make sure everything is converted to string.
# This is important for comparing the constructed data with the original.
prices = prices.astype('string')

# Write the output file.
outfile = sym + '-تعدیل-دستی.csv'
prices.to_csv(outfile, index=False, lineterminator='\n')

# Compare the constructed data with the original.
adj_postfix_by_type = {1: '-ت', 2: '-ا'}
origfile = sym + adj_postfix_by_type[adj_type] + '.csv'

adj_internal = pd.read_csv(origfile, dtype='string')
adj_external = pd.read_csv(outfile, dtype='string') # or you can use `prices`

orig, copy = adj_internal, adj_external
print('Does constructed data equals the original?', copy.equals(orig), '\n')
neqlen = orig.compare(copy).shape[0]

# If there are differences, print a report on non-equal items.
if neqlen > 0:
	print('Total number of non-equal items?', neqlen, '\n')
	print('How many non-equal items in each price column:')
	for k in cols_price_all:
		r = copy[k] == orig[k]
		neqs = r[r == False]
		print(k + ':\t', neqs.shape[0])
else:
	print('Operation fininshed successfully.')
