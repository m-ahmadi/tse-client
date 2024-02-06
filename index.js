#!/usr/bin/env node
const tse = require('./tse.js');
if (require.main !== module) {
  module.exports = tse;
  return;
}
const cmd = require('commander');
const Progress = require('progress');
const { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } = require('fs');
const { join, resolve } = require('path');
const { toGregorian, toJalaali } = require('jalaali-js');
require('./lib/colors.js');

const defaultSettings = {
  symbols:               [],
  priceColumns:          '0 2 3 4 5 6 7 8 9',
  priceAdjust:           0,
  priceStartDate:        '13800101',
  priceDaysWithoutTrade: false,
  fileOutdir:            './',
  fileName:              4,
  fileExtension:         'csv',
  fileDelimiter:         ',',
  fileEncoding:          'utf8bom',
  fileHeaders:           true,
  cache:                 true,
  mergedSymbols:         true,
  intraday: {
    symbols:          [],
    startDate:        '1d',
    endDate:          '',
    gzip:             false,
    altDate:          false,
    outdir:           '',
    dirName:          4,
    fileEncoding:     'utf8bom',
    fileHeaders:      true,
    cache:            true,
    reUpdateNoTrades: false,
    retry:            tse.INTRADAY_UPDATE_RETRY_COUNT,
    retryDelay:       tse.INTRADAY_UPDATE_RETRY_DELAY,
    chunkDelay:       tse.INTRADAY_UPDATE_CHUNK_DELAY,
    chunkMaxWait:     tse.INTRADAY_UPDATE_CHUNK_MAX_WAIT,
    servers:          tse.INTRADAY_UPDATE_SERVERS.join(' ')
  },
  instrument: {
    cols: 'Symbol'
  }
};
if ( !existsSync(join(__dirname,'settings.json')) ) saveSettings(defaultSettings);
const savedSettings = require('./settings.json');
const { log } = console;
const t  = '\n\t\t\t\t\t ';
const t2 = '\n\t\t\t\t   ';
const t3 = '\n\t\t\t       ';
const t4 = '\n\t\t\t   ';

const BOM = '\ufeff';

cmd
  .helpOption('-h, --help', 'Show help.')
  .name('tse')
  .usage('[symbols...] [options]\n  tse faSymbol1 faSymbol2 -o /mydata -j 1 -x txt -e utf8 -H')
  .description('A client for fetching stock data from the Tehran Stock Exchange. (TSETMC)')
  .arguments('[symbols...]').action(() => 0)
  .option('-s, --symbol <string>',           'A space-separated string of symbols.')
  .option('-i, --symbol-file <string>',      'Path to a file that contains newline-separated symbols.')
  .option('-f, --symbol-filter <string>',    'Select symbols based on a space separated string of filter options. (AND-based)'+t+
                                               't=id,id,...       symbol-type ids       (tse ls -T)'+t+
                                               'i=id,id,...       industry-sector ids   (tse ls -I)'+t+
                                               'm=id,id,...       market ids            (tse ls -M)'+t+
                                               'b=id,id,...       board-code ids        (tse ls -B)'+t+
                                               'y=id,id,...       market-code ids       (tse ls -Y)'+t+
                                               'g=id,id,...       symbol-group-code ids (tse ls -G)'+t+
                                               'P=regex|!regex    only symbols that match the pattern. put ! before regex to negate it. (e.g. P=\\d$ or P=!\\d$)'+t+
                                               'D=regex|!regex    only symbols that their last trade day (Gregorian YYYYMMDD) match the pattern (e.g. D=^2022)'+t+
                                               'R                 boolean. if present, then exclude renamed symbols')
  .option('-d, --symbol-delete',             'Boolean. Delete specified symbols from selection. default: false')
  .option('-a, --symbol-all',                'Boolean. Select all symbols. default: false')
  .option('-c, --price-columns <string>',    'A comma/space separated list of column indexes with optional headers.'+t+'index only:      1,2,3'+t+'index & header:  1:a 2:b 3:c'+t+'default: "0 2 3 4 5 6 7 8 9" (help: tse ls -A)')
  .option('-j, --price-adjust <number>',     'Type of adjustment applied to prices. options: 0|1|2 default: 0'+t+'0: none'+t+'1: capital increase + dividends'+t+'2: capital increase')
  .option('-b, --price-start-date <string>', 'Generate prices from this date onwards. default: "13800101". Two valid patterns:'+t+'Shamsi or Gregorian YYYYMMDD as ^\\d{8}$ with lowest possible value of 13800101 or 20030123'+t+'relative date as ^\\d{1,3}(y|m|d)$ for example:'+t+'  3m: last 3 months'+t+'  2y: last 2 years'+t+'  7d: last 7 days')
  .option('-t, --price-days-without-trade',  'Boolean. Include days without trade in generated files. default: false')
  .option('-o, --file-outdir <string>',      'Location of the generated files. default: "./"')
  .option('-n, --file-name <number>',        'Filename of the generated files. options: 0|1|2|3|4 default: 4'+t+'0: isin_code'+t+'1: latin_name'+t+'2: latin_symbol'+t+'3: farsi_name'+t+'4: farsi_symbol')
  .option('-x, --file-extension <string>',   'Extension of the generated files. default: "csv"')
  .option('-l, --file-delimiter <string>',   'A single character to use as delimiter in generated files. default: ","')
  .option('-e, --file-encoding <string>',    'Encoding of the generated files. options: utf8|utf8bom|ascii. default: "utf8bom"')
  .option('-H, --file-no-headers',           'Boolean. Generate files without the header row. default: false')
  .option('-k, --no-cache',                  'Boolean. Do not cache the data. default: false')
  .option('-u, --no-merged-symbols',         'Boolean. Do not merge the data of similar symbols. default: false')
  .option('--save',                          'Boolean. Save options for later use. default: false')
  .option('--save-reset',                    'Boolean. Reset saved options back to defaults. default: false')
  .option('--cache-dir [path]',              'Show or change the location of cache directory.'+t+'if [path] is provided, new location is set but'+t+'existing content is not moved to the new location.')
  .version(''+JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8')).version, '-v, --version', 'Show version number.');
cmd.command('instrument').alias('i').description('View instrument data. By default output is shown in CSV text. (help: tse i -h)')
  .option('-F, --filter <string>',           'Filter rows based on a filter string. (same string syntax as: tse -f)')
  .option('--cols [string]',                 'Filter columns using comma-separated names of the columns to be shown. Default: "'+defaultSettings.instrument.cols+'"'+t4+'if empty, then selects all columns (e.g. tse i --cols)'+t4+'only accepts comma-separated spaceless words as ^\\w+(,\\w+)*$'+t4+'for a list of all column names run: `tse ls -N`')
  .option('--header',                        'Include header row when printing CSV.')
  .option('--json',                          'Print JSON.')
  .option('--table',                         'Print using `console.table()`')
  .option('--bom',                           'Prepend BOM character to output before printing.')
  .action(instrument)
cmd.command('list').alias('ls').description('Show information about current settings and more. (help: tse ls -h)')
  .option('-S, --saved-symbols',             'List saved symbols.')
  .option('-D, --saved-settings',            'List saved settings.')
  .option('-A, --price-columns',             'Show all possible price columns and indexes.')
  .option('-N, --instrument-columns',        'Show all possible instrument columns.')
  .option('-T, --id-symbol-type',            'Show all possible symbol-type IDs. "Instrument.YVal"')
  .option('-I, --id-industry-sector-code',   'Show all possible industry-sector-code IDs. "Instrument.CSecVal"')
  .option('-M, --id-market',                 'Show all possible market IDs. "Instrument.Flow"')
  .option('-B, --id-board-code',             'Show all possible board-code IDs. "Instrument.CComVal"')
  .option('-Y, --id-market-code',            'Show all possible market-code IDs. "Instrument.YMarNSC"')
  .option('-G, --id-symbol-group-code',      'Show all possible symbol-group-code IDs. "Instrument.CGrValCot"')
  .option('-O, --id-sort [columnIndex]',     'Sort the IDs table by specifying the index of the column. default: 1'+t2+'put underline at end for ascending sort: 1_')
  .option('-R, --renamed-symbols',           'Show the symbols that were renamed for maintaining symbol uniqueness.')
  .option('--csv',                           'Print CSV text instead of formatted text. Only applies to -R and --id-* options.')
  .option('--json',                          'Print JSON text instead of formatted text. Only applies to -R and --id-* options.')
  .option('--search <query>',                'Search symbols.')
  .action(list);
cmd.command('intraday [symbols...]').alias('itd').description('Crawl Intraday Data. (help: tse itd -h)')
  .addHelpText('after', '\nCommon Options:\n  '+[
          '-s, --symbol <string>',
          '-i, --symbol-file <string>',
          '-f, --symbol-filter <string>',
          '-d, --symbol-delete',
          '-a, --symbol-all',
          '-b, --start-date <string>     default: "1d"',
          '-o, --outdir <string>         Output location and whether to generate data. If not set, then nothing is generated. default: ""',
          '-n, --dir-name <number>       Same as --file-name',
          '-e, --file-encoding <string>',
          '-H, --file-no-headers',
          '-k, --no-cache'
    ].join('\n  '))
  .option('-m, --end-date <string>',         'Upper boundary for --start-date. default: ""'+t3+'accepts same patterns as --start-date'+t3+'cannot be less than --start-date'+t3+'if empty, then latest possible date is used')
  .option('-z, --gzip',                      'Boolean. Output raw gzip files. default: false')
  .option('-y, --alt-date',                  'Boolean. Output results with Shamsi dates. default: false')
  .option('-r, --re-update-no-trades',       'Boolean. Update already cached items that have no "trade" data. default: false')
  .option('--retry <number>',                'Amount of retry attempts before giving up. default: '+defaultSettings.intraday.retry)
  .option('--retry-delay <number>',          'Amount of delay (in ms) to wait before making another retry. default: '+defaultSettings.intraday.retryDelay)
  .option('--chunk-delay <number>',          'Amount of delay (in ms) to wait before requesting another chunk of dates. default: '+defaultSettings.intraday.chunkDelay)
  .option('--chunk-max-wait <number>',       'Max time (in ms) to wait for a request to finish before force ending it. (needs Node v15+ or it has no effect) default: '+defaultSettings.intraday.chunkMaxWait)
  .option('--servers <string>',              'A space-separated string of integers to use as CDN servers in the update process. default: "'+defaultSettings.intraday.servers+'"')
  .action(intraday);
cmd.parse(process.argv);

const subs = new Set( cmd.commands.map(i=>[i.name(),i.alias()]).reduce((a,c)=>a=a.concat(c),[]) );
if (cmd.rawArgs.find(i=> subs.has(i))) return;
if (cmd.opts().cacheDir) { handleCacheDir(cmd.opts().cacheDir); return; }



(async () => {
  let inserr;
  const instruments = await tse.getInstruments().catch(err => inserr = err);
  if (inserr) { log('\nFatal Error #1:  '.red + inserr.title.red +'\n\n'+ inserr.detail.message.red); process.exitCode = 1; return; }
  const rawOpts = cmd.opts();
  const allSymbols = instruments.map(i => i.Symbol);
  const symbols = resolveSymbols(allSymbols, savedSettings.symbols, instruments, {args: cmd.args, ...rawOpts});
  
  const fileHeaders = !rawOpts.fileNoHeaders;
  delete rawOpts.fileNoHeaders;
  const opts = { symbols, fileHeaders, ...rawOpts };
  ['save','saveReset'].forEach(k => delete opts[k]);
  Object.keys(opts).forEach(key => opts[key] === undefined && delete opts[key]);
  
  const settings = { ...defaultSettings, ...savedSettings, ...opts };
  
  log('Total symbols:'.grey, (symbols.length+'').yellow );

  if (symbols.length) {
    const progress = new Progress(':bar :percent (Elapsed: :elapsed s)', {total: 100, width: 18, complete: '█', incomplete: '░', clear: true});
    
    const { priceColumns, priceDaysWithoutTrade, fileDelimiter, fileHeaders, fileOutdir, fileExtension, cache, mergedSymbols } = settings;
    let { priceStartDate, priceAdjust, fileName, fileEncoding } = settings;
    priceStartDate = parseDateOption(priceStartDate);
    priceAdjust    = +priceAdjust;
    fileName       = +fileName;
    
    if (!priceStartDate) { abort('Invalid option:', '--price-start-date', '\n\tPattern not matched:'.red, '^\\d{1,3}(y|m|d)$'); return }
    
    let priceColumnsParsed;
    if (priceColumns) {
      priceColumnsParsed = parseColstr(priceColumns);
      if (!priceColumnsParsed) { abort('Invalid option:', '--price-columns'); return; }
    }
    
    if ( !/^[0-2]$/.test(''+priceAdjust) )            { abort('Invalid option:', '--price-adjust',   '\n\tPattern not matched:'.red, '^[0-2]$');                     return; }
    if ( !/^.$/.test(fileDelimiter) )                 { abort('Invalid option:', '--file-delimiter', '\n\tPattern not matched:'.red, '^.$');                         return; }
  //if (!existsSync(fileOutdir))                      { abort('Invalid option:', '--file-outdir',    '\n\tDirectory doesn\'t exist:'.red, resolve(fileOutdir).grey); return; }
    if ( !existsSync(fileOutdir) ) mkdirSync(fileOutdir);
    if ( !statSync(fileOutdir).isDirectory() )        { abort('Invalid option:', '--file-outdir',    '\n\tPath is not a directory:'.red,  resolve(fileOutdir).grey); return; }
    if ( !/^[0-4]$/.test(''+fileName) )               { abort('Invalid option:', '--file-name',      '\n\tPattern not matched:'.red, '^[0-4]$');                     return; }
    if ( !/^.{1,11}$/.test(fileExtension) )           { abort('Invalid option:', '--file-name',      '\n\tPattern not matched:'.red, '^.{1,11}$');                   return; }
    if ( !/^(utf8(bom)?|ascii)$/.test(fileEncoding) ) { abort('Invalid option:', '--file-encoding',  '\n\tPattern not matched:'.red, '^(utf8(bom)?|ascii)$');        return; }
    
    const _settings = {
      columns:             priceColumnsParsed,
      adjustPrices:        priceAdjust,
      daysWithoutTrade:    priceDaysWithoutTrade,
      startDate:           priceStartDate,
      csv:                 true,
      csvHeaders:          fileHeaders,
      csvDelimiter:        fileDelimiter,
      onprogress:          (n) => progress.tick(n - progress.curr),
      progressTotal:       86,
      cache,
      mergeSimilarSymbols: mergedSymbols
    };
    const { error, data } = await tse.getPrices(symbols, _settings);
    
    let incompleteError, incompleteCount;
    if (error) {
      const { code, title } = error;
      
      process.exitCode = 1;
      
      if (code === 1 || code === 2) {
        const fatal = ('\nFatal Error #'+code+':').red +'  '+ title.red +'\n\n';
        
        if (code === 1) {
          const { detail } = error;
          const msg = typeof detail === 'object' ? detail.message : detail;
          log(fatal + msg.red);
        } else if (code === 2) {
          const { symbols } = error;
          log(fatal + symbols.join('\n').red);
        }
        
        return;
      
      } else if (code === 3) {
        const { fails } = error;
        
        incompleteCount = fails.length;
        incompleteError = '\n'
            + (title+':').redBold + '\n'
            + fails.join('\n').red;
        
        fails.forEach(i => data[ symbols.indexOf(i) ] = undefined);
      }
    }
    
    let bom = '';
    if (fileEncoding === 'utf8bom') {
      bom = BOM;
      fileEncoding = undefined;
    }
    
    const symins = await tse.getInstruments(true, false, 'Symbol');
    const datalen = data.length;
    const tickAmount = 14 / datalen;
    
    data.forEach((file, i) => {
      if (file === undefined) { progress.tick(tickAmount); return; }
      const sym = symbols[i];
      const instrument = symins[sym];
      const name = safeWinFilename( getFilename(fileName, instrument, priceAdjust) );
      writeFileSync(join(fileOutdir, name+'.'+fileExtension), bom+file, fileEncoding);
      progress.tick(tickAmount);
    });
    
    if (!progress.complete) progress.tick(progress.total - progress.curr);
    
    if (incompleteError) {
      log((' √: '+(datalen - incompleteCount)).green + ('\n X: '+incompleteCount).red);
      log(incompleteError);
    } else {
      log(' √'.green);
    }
  } else {
    log('\nNo symbols to process.'.redBold);
  }

  const { save, saveReset } = rawOpts;
  if (save) saveSettings(settings);
  if (saveReset) saveSettings(defaultSettings);

})();

async function intraday(args, subOpts) {
  let inserr;
  const instruments = await tse.getInstruments().catch(err => inserr = err);
  if (inserr) { log('\nFatal Error #1:  '.red + inserr.title.red +'\n\n'+ inserr.detail.message.red); process.exitCode = 1; return; }
  const allSymbols = instruments.map(i => i.Symbol);
  
  const _defaultSettings = defaultSettings.intraday;
  const _savedSettings   = savedSettings.intraday;
  
  const gOpts = cmd.opts();
  const symbols = resolveSymbols(allSymbols, savedSettings.symbols, instruments, {args, ...gOpts});
  
  const {
    priceStartDate: startDate,
    fileOutdir:     outdir,
    fileName,
    fileEncoding,
    fileNoHeaders,
    cache
  } = gOpts;
  const opts = { symbols, startDate, outdir, dirName: fileName, fileEncoding, fileHeaders: !fileNoHeaders, cache, ...subOpts };
  Object.keys(opts).forEach(key => opts[key] === undefined && delete opts[key]);
  
  const settings = { ..._defaultSettings, ..._savedSettings, ...opts };
  
  log('Total symbols:'.grey, (symbols.length+'').yellow );
  
  if (symbols.length) {
    const progress = new Progress(':bar :percent (Elapsed: :elapsed s)', {total: 100, width: 18, complete: '█', incomplete: '░', clear: true});
    
    const { gzip, outdir, cache, fileHeaders, altDate, reUpdateNoTrades } = settings;
    let { startDate, endDate, dirName, fileEncoding, retry, retryDelay, chunkDelay, chunkMaxWait, servers } = settings;
    startDate = parseDateOption(startDate);
    dirName   = +dirName;
    servers   = servers.trim();
    
    if (!startDate)                                   { abort('Invalid option:', '--start-date',     '\n\tPattern not matched:'.red, '^\\d{1,3}(y|m|d)$');       return; }
    if (endDate) {
      endDate = parseDateOption(endDate);
      if (!endDate)                                   { abort('Invalid option:', '--end-date',       '\n\tPattern not matched:'.red, '^\\d{1,3}(y|m|d)$');       return; }
      if (+endDate < +startDate)                      { abort('Invalid option:', '--end-date',       '\n\tCannot be less than'.red, '--start-date');             return; }
    }
    if (outdir) {
      if ( !existsSync(outdir) ) mkdirSync(outdir);
      if ( !statSync(outdir).isDirectory() )          { abort('Invalid option:', '--output-dir',     '\n\tPath is not a directory:'.red,  resolve(outdir).grey); return; }
    }
    if ( !/^[0-4]$/.test(''+dirName) )                { abort('Invalid option:', '--dir-name',       '\n\tPattern not matched:'.red, '^[0-4]$');                 return; }
    if ( !/^(utf8(bom)?|ascii)$/.test(fileEncoding) ) { abort('Invalid option:', '--file-encoding',  '\n\tPattern not matched:'.red, '^(utf8(bom)?|ascii)$');    return; }
    if ( !/^\d+$/.test(retry) )                       { abort('Invalid option:', '--retry',          '\n\tPattern not matched:'.red, '^\\d+$');                  return; }
    if ( !/^\d+$/.test(retryDelay) )                  { abort('Invalid option:', '--retry-delay',    '\n\tPattern not matched:'.red, '^\\d+$');                  return; }
    if ( !/^\d+$/.test(chunkDelay) )                  { abort('Invalid option:', '--chunk-delay',    '\n\tPattern not matched:'.red, '^\\d+$');                  return; }
    if ( !/^\d+$/.test(chunkMaxWait) )                { abort('Invalid option:', '--chunk-max-wait', '\n\tPattern not matched:'.red, '^\\d+$');                  return; }
    if ( !/^(-?\d+\s?)+$/.test(servers) )             { abort('Invalid option:', '--servers',        '\n\tPattern not matched:'.red, '^(\\d+\\s?)+$', '\n\t'+(!servers?'Cannot be empty.':'Cannot contain anything other than positive integers.').red); return; }
    
    const _settings = {
      startDate,
      endDate,
      cache,
      gzip,
      reUpdateNoTrades,
      updateOnly:    outdir ? false : true,
      onprogress:    (n) => progress.tick(n - progress.curr),
      progressTotal: outdir ? 86 : 100,
      retryCount:    +retry,
      retryDelay:    +retryDelay,
      chunkDelay:    +chunkDelay,
      chunkMaxWait:  +chunkMaxWait,
      servers:       servers.split(' ').map(i => +i)
    };
    const { error, data } = await tse.getIntraday(symbols, _settings);
    
    let incompleteError, incompleteCount;
    if (error) {
      const { code, title } = error;
      
      process.exitCode = 1;
      
      if (code === 1 || code === 2) {
        const fatal = ('\nFatal Error #'+code+':').red +'  '+ title.red +'\n\n';
        
        if (code === 1) {
          const { detail } = error;
          const msg = typeof detail === 'object' ? detail.message : detail;
          log(fatal + msg.red);
        } else if (code === 2) {
          const { symbols } = error;
          log(fatal + symbols.join('\n').red);
        }
        
        return;
        
      } else if (code === 3 || code === 4) {
        const { fails } = error;
        
        if (code === 3) {
          incompleteCount = fails.length;
          incompleteError = '\n'
              + (title+':').redBold + '\n'
              + fails.join('\n').red;
          
          fails.forEach(i => data[ symbols.indexOf(i) ] = undefined);
          
        } else if (code === 4) {
          const syms = Object.keys(fails);
          
          incompleteCount = syms.length;
          incompleteError = '\n'
            + (title+':').redBold + '\n'
            + syms.map(sym => sym +': '+ fails[sym].join(' ')).join('\n').red;
        }
      }
    }
    
    if (outdir) {
      let bom = '';
      if (fileEncoding === 'utf8bom') {
        bom = BOM;
        fileEncoding = undefined;
      }
      
      const groupCols = tse.itdGroupCols;
      const filenames = groupCols.map(i => i[0]);
      
      const shamsi = s => {
        const { jy, jm, jd } = toJalaali(+s.slice(0,4), +s.slice(4,6), +s.slice(6,8));
        return (jy*10000) + (jm*100) + jd + '';
      };
      
      const symins = await tse.getInstruments(true, false, 'Symbol');
      const datalen = data.length;
      const tickAmount = 14 / datalen;
      
      data.forEach((item, i) => {
        if (!item || item.filter(i => i[1] === 'N/A').length === item.length) {
          progress.tick(tickAmount);
          return;
        }
        
        const sym = symbols[i];
        const instrument = symins[sym];
        const name = safeWinFilename( getFilename(dirName, instrument) );
        const dir = join(outdir, name);
        if ( !existsSync(dir) ) mkdirSync(dir);
        
        if (gzip) {
        
          for (let [deven, content] of item) {
            if (!content) continue;
            if (altDate) deven = shamsi(''+deven);
            writeFileSync(join(dir, ''+deven+'.csv.gz'), content);
          }
          
        } else {
          
          for (let [deven, content] of item) {
            if (!content || content === 'N/A') continue;
            if (altDate) deven = shamsi(''+deven);
            const idir = join(dir, ''+deven);
            if ( !existsSync(idir) ) mkdirSync(idir);
            
            content.split('\n\n').forEach((v,j) => {
              if (!v) return;
              const headers = fileHeaders ? groupCols[j][1].join() + '\n' : '';
              writeFileSync(join(idir, filenames[j] + '.csv'), bom+headers+v, fileEncoding);
            });
          }
        
        }
        
        progress.tick(tickAmount);
      });
    }
    
    if (!progress.complete) progress.tick(progress.total - progress.curr);
    
    if (incompleteError) {
      log((' √: '+(symbols.length - incompleteCount)).green + ('\n X: '+incompleteCount).red);
      log(incompleteError);
    } else {
      log(' √'.green);
    }
  } else {
    log('\nNo symbols to process.'.redBold);
  }
  
  const { save, saveReset } = gOpts;
  
  if (save) {
    savedSettings.intraday = settings;
    saveSettings(savedSettings);
  }
  
  if (saveReset) {
    savedSettings.intraday = _defaultSettings;
    saveSettings(savedSettings);
  }
}

function resolveSymbols(allSymbols, savedSymbols=[], instruments, { args, symbol, symbolFile, symbolFilter, symbolDelete, symbolAll }) {
  if (symbolAll) return symbolDelete ? [] : allSymbols;
  
  let symbols = [...args];

  if (symbol) {
    const syms = symbol.split(' ');
    symbols.push(...syms);
  }

  if (symbolFile) {
    try {
      const syms = readFileSync(symbolFile, 'utf8').replace(/\ufeff/,'').replace(/\r\n/g, '\n').trim().split('\n');
      symbols.push(...syms);
    } catch (e) {
      log(e.message.red);
    }
  }
  
  if (symbolFilter) {
    const filters = parseFilterStr(symbolFilter);
    if (filters) {
      const syms = filterInstruments(instruments, filters).map(i => i.Symbol);
      symbols.push(...syms);
    } else {
      log('Invalid filter string.'.redBold);
    }
  }
  
  if (symbolDelete) {
    symbols = savedSymbols.filter(i => symbols.indexOf(i) === -1);
  } else {
    symbols = [...new Set([...savedSymbols, ...symbols])];
  }
  
  const finalSymbols = symbols.filter(symbol => {
    if (allSymbols.indexOf(symbol) !== -1) {
      return true;
    } else {
      log('No such symbol:'.redBold, symbol.whiteBold);
      return false;
    }
  });
  
  return finalSymbols;
}
function handleCacheDir(newdir) {
  if (typeof newdir === 'string') {
    tse.CACHE_DIR = newdir;
    if (tse.CACHE_DIR !== newdir) log('Invalid option:'.redBold, '--cache-dir'.whiteBold, '\n\tDirectory path is an existing file.'.red);
  }
  log(tse.CACHE_DIR);
}

// helpers
function parseFilterStr(str='') {
  const map = {t:'YVal', i:'CSecVal', m:'Flow', b:'CComVal', y:'YMarNSC', g:'CGrValCot'};
  
  const norm = new Set(Object.keys(map));
  const spec = new Set(['P', 'D', 'R']);
  
  const arr = str.split(' ');
  
  const normal = new Map();
  const special = new Map();
  
  for (const i of arr) {
    const arg = i.slice(0,1);
    const isNormal = norm.has(arg);
    const isSpecial = spec.has(arg);
    
    if (isNormal) {
      if (i.indexOf('=') === -1) continue;
      const [key, val] = i.split('=');
      if ( !map[key] ) continue;
      if ( !/^[\d\w,]+$/.test(val) ) continue;
      const parsed = key === 'i' ? val.split(',').map(i=> i+' ') : val.split(',');
      normal.set(map[key], new Set(parsed));
      continue;
    }
    
    if (isSpecial) {
      if (arg === 'P' || arg === 'D') {
        if (i.indexOf('=') === -1) continue;
        let [, val] = i.split('=');
        let not;
        if (val[0] === '!') {
          val = val.slice(1);
          not = true;
        }
        let r;
        try { r = new RegExp(val); } catch { continue; }
        special.set(arg, not ? s => !r.test(s)  : s => r.test(s));
        continue;
      }
      
      if (arg === 'R') special.set(arg, true);
    }
  }
  
  return normal.size + special.size === arr.length ? { normal, special } : undefined;
}
function parseColstr(str='') {
  if (!str) return;
  const chr = str.indexOf(' ') !== -1 ? ' ' : ',';
  const res = str.split(chr).map(i => {
    if (!/^\d{1,2}$|^\d{1,2}:\w+$/.test(i)) return;
    const row = i.indexOf(':') !== -1
      ? [  +i.split(':')[0],  i.split(':')[1]  ]
      : [  +i  ];
    if (Number.isNaN(row[0]) || row[0] === undefined) return;
    return row;
  });
  return res.filter(i=>!i).length ? undefined : res;
}
function parseDateOption(s) {
  let result;
  
  const mindate = 20010321;
  const relative = s.match(/^(\d{1,3})(y|m|d)$/);
  
  if (relative) {
    const n = parseInt(relative[1], 10);
    const m = ({y:'FullYear',m:'Month',d:'Date'})[ relative[2] ];
    const d = new Date();
    d['set'+m](d['get'+m]() - n);
    d.setDate(d.getDate() - 1);
    const res = (d.getFullYear()*10000) + ((d.getMonth()+1)*100) + d.getDate();
    result = res < mindate ? ''+mindate : ''+res;
  } else if (/^\d{8}$/.test(s)) {
    let src = [+s.slice(0,4), +s.slice(4,6), +s.slice(6,8)];
    if (src[0] < 2000) {
      const {gy,gm,gd} = toGregorian(...src);
      src = [gy,gm,gd];
    }
    const [y,m,d] = src;
    const res = (y*10000) + (m*100) + d;
    result = res < mindate ? ''+mindate : ''+res;
  }
  
  return result;
}
function filterInstruments(instruments, filters) {
  const { normal, special } = filters;
  const keys = [...normal.keys()];
  const { P, D, R } = Object.fromEntries([...special]);
  
  const ins = instruments.filter(instrument => {
    const { Symbol, DEven, SymbolOriginal } = instrument;
    const renamed = SymbolOriginal ? true : false;
    const conds = [
      keys.every( key => normal.get(key).has(instrument[key]) ),
      P            ? P(Symbol) : true,
      D            ? D(DEven)  : true,
      R && renamed ? false     : true
    ];
    return conds.every(i => i);
  });
  
  return ins;
}
function abort(m1, m2, ...rest) {
  console.log('\n');
  console.log(m1.redBold, m2.whiteBold, ...rest);
  process.exitCode = 1;
  console.log('\naborted'.red);
}
function suffix(YMarNSC, adjust, fa=false) {
  let str = '';
  if (YMarNSC !== 'ID') {
    if (adjust === 1) {
      str = fa ? '-ت' : '-a';
    } else if (adjust === 2) {
      str = fa ? '-ا' : '-i';
    }
  }
  return str;
}
function getFilename(filename, instrument, adjust) {
  const y = instrument.YMarNSC;
  const a = adjust;
  const f = filename;
  
  const str =
    f === 0 ? instrument.CIsin       + suffix(y, a) :
    f === 1 ? instrument.LatinName   + suffix(y, a) :
    f === 2 ? instrument.LatinSymbol + suffix(y, a) :
    f === 3 ? instrument.Name        + suffix(y, a, true) :
    f === 4 ? instrument.Symbol      + suffix(y, a, true) :
    instrument.Symbol + suffix(y, a, true); // instrument.CIsin + suffix(y, a)
  
  return str;
}
function safeWinFilename(str) {
  return str.replace(/[\\\/:*?"<>|]/g, ' ');
}
function saveSettings(obj) {
  writeFileSync(join(__dirname,'settings.json'), JSON.stringify(obj, null, 2));
}
function printTable(table=[], cols=[]) {
  if (!table.length) return '';
  const colors = ['yellow', 'cyan', 'green', 'green', 'green'];
  
  const maxlen = Array(table[0].length).fill(0);
  
  
  for (const row of table) {
    row.forEach((cell, i, a) => {
      const _cell = cell.toString();
      a[i] = _cell;
      if (_cell.length > maxlen[i]) maxlen[i] = _cell.length;
    });
  }
  const total = maxlen.reduce((a,c)=>a+=c, 0);
  

  const line = '='.repeat( total + (cols.length>3?17:13) ) + '\n';
  
  let s = '';
  
  
  s += line;

  cols.forEach((name, i) => {
    const n = Math.abs(maxlen[i] - name.length);
    s += ` ${name.yellowBold} ${' '.repeat(n)}  `;
    
  });
  s += '\n';
  s += line;
  
  for (const row of table) {
    s += '│';
    row.forEach((cell, i) => {
      const n = Math.abs(maxlen[i] - cell.length);
      // s += ' '+  cell.green +' '.repeat(n) + ' │';
      const c = colors[i];
      s += ` ${cell[c]} ${' '.repeat(n)} │`;
    });
    s += '\n';
  }
  
  s += line;
  
  console.log(s);
}

async function instrument(args) {
  const { filter, header, table, json, bom } = args;
  let { cols=defaultSettings.instrument.cols, } = args;
  
  const ins = await tse.getInstruments();
  const validCols = new Set(Object.keys(ins[0]));
  
  if (cols === '' || typeof cols === 'boolean') cols = [...validCols].join();
  if (!/^\w+(,\w+)*$/.test(cols)) { abort('Invalid option:', '--cols', '\n\tPattern not matched:'.red, '^\\w+(,\\w+)*$');         return; }
  
  const colsUnik = [...new Set(cols.split(','))];
  const wrongCols = colsUnik.filter(i => !validCols.has(i));
  if (wrongCols.length)           { abort('Invalid option:', '--cols', '\n\tNo such column(s):'.red, wrongCols.join().whiteBold); return; }
  
  const sortFa = (a, b) => a.Symbol.localeCompare(b.Symbol, 'fa');
  const bomOrNot = bom ? BOM : '';
  
  let finalInstruments;
  
  if (filter) {
    const filters = parseFilterStr(filter);
    if (filters) {
      finalInstruments = filterInstruments(ins, filters).sort(sortFa);
    } else {
      abort('Invalid option:', '--filter', '\n\tFilter string syntax error.');
      return;
    }
  } else {
    finalInstruments = ins.sort(sortFa);
  }
  
  if (table || json) {
    const outObjs = finalInstruments.map(o => Object.fromEntries(colsUnik.map(k => [k, o[k]])) );
    
    if (table) {
      console.table(outObjs);
    } else if (json) {
      const jsonstr = JSON.stringify(outObjs);
      log(jsonstr);
    }
    return;
  }
  
  const rows = finalInstruments.map(o => colsUnik.map(k => o[k]).join());
  const finalRows = header ? [colsUnik, ...rows] : rows;
  const csvstr = finalRows.join('\n');
  log(bomOrNot + csvstr);
}
async function list(opts) {
  const { savedSymbols, savedSettings: _savedSettings, priceColumns, instrumentColumns, renamedSymbols, csv, json, search } = opts;
  const { table } = console;
  
  if (savedSymbols) {
    const selins = savedSettings.symbols.join('\n');
    log('\nSaved symbols:'.yellow);
    table( selins.length ? selins.yellowBold : 'none'.yellow );
    
    const selins2 = savedSettings.intraday.symbols.join('\n');
    log('\nSaved intraday symbols:'.yellow);
    table( selins2.length ? selins2.yellowBold : 'none'.yellow );
  }
  
  if (_savedSettings) {
    log('\nSaved settings:'.yellow);
    const a = {...savedSettings};
    const b = a.intraday;
    
    delete a.symbols;
    delete a.intraday;
    
    delete b.symbols;
    
    const [x, y] = [a, b].map(o => 
      Object.keys(o).reduce((r, k) => (r[ '--'+k.replace(/([A-Z])/g, '-$1').toLowerCase() ] = o[k], r), {})
    );
    
    table(x);
    // const x1 = Object.keys(x).reduce((r,k)=> (r.push(['--'+k.replace(/([A-Z])/g, '-$1').toLowerCase(), x[k]]), r), []);
    // printTable(x1);
    
    log('\nSaved intraday settings:'.yellow);
    table(y);
  }
  
  if (priceColumns) {
    log('\nAll valid column indexes:'.yellow);
    table(tse.columnList);
  }
  
  if (instrumentColumns) {
    const [obj] = await tse.getInstruments();
    const cols = Object.keys(obj).join();
    log(cols);
  }
  
  if (renamedSymbols) {
    if (!csv && !json) log('\nThe renamed symbols:'.yellow);
    const rows = await tse.getInstruments();
    
    const renamed   = rows.filter(i=> i.SymbolOriginal);
    const renOrig   = new Set(renamed.map(i=> i.SymbolOriginal));
    const unrenamed = rows.filter(i=> renOrig.has(i.Symbol) ).map(i=> i.InsCode);
    const all       = new Set([...renamed.map(i=> i.InsCode), ...unrenamed]);
    const alli      = rows.map((v,i) => all.has(v.InsCode) ? i : -1).filter(i=>i>-1);
    
    const flows = [,'بورس','فرابورس',,'پایه'];
    const list = alli.map(i => {
      const instrument = rows[i];
      const {Symbol, Name, DEven, SymbolOriginal, Flow} = instrument;
      const flow = flows[+Flow];
      return SymbolOriginal
        ? [Symbol, SymbolOriginal, flow, DEven, Name]
        : ['',     Symbol,         flow, DEven, Name];
    }).sort((a,b)=>a[0].localeCompare(b[0],'fa'))
      .sort((a,b)=>a[1].localeCompare(b[1],'fa'));
    
    const header = ['renamed','original','Flow','DEven','Name'];
    if (csv) {
      const csvstr = [header, ...list].map(i=> i.join(',')).join('\n');
      log(BOM + csvstr);
    } else if (json) {
      const jsonstr = JSON.stringify([header, ...list]);
      log(jsonstr);
    } else {
      printTable(list, header);
    }
  }
  
  if (typeof search === 'string') {
    const str = search;
    if (str.length > 1) {
      const ins = await tse.getInstruments();
      const res = ins
        .filter(i => i.Symbol.includes(str) || i.Name.includes(str))
        .map(i => `${i.Symbol.yellowBold} (${i.Name.grey})`)
        .sort()
        .join('\n');
      log(res ? res : 'No match for: '.redBold + str.whiteBold);
    } else {
      log('At least 2 characters'.redBold);
    }
  }
  
  const { idSymbolType, idIndustrySectorCode, idMarket, idBoardCode, idMarketCode, idSymbolGroupCode } = opts;
  
  if (idSymbolType || idIndustrySectorCode || idMarket || idBoardCode || idMarketCode || idSymbolGroupCode) {
    const ins = await tse.getInstruments();
    await listIdTables(opts, ins);
  }
}
async function listIdTables(opts, instruments) {
  const { idSymbolType, idIndustrySectorCode, idMarket, idBoardCode, idMarketCode, idSymbolGroupCode, idSort, csv, json } = opts;
  
  const raw = require('./info.json');
  
  Object.keys(raw).forEach(k => raw[k].forEach(j => j.push(0))); // add count col
  
  instruments.forEach(i => {
    let found;
    
    found = raw.Flow.find(j => j[0] === i.Flow);
    if (found) found[found.length-1] += 1;
    
    found = raw.YVal.find(j => j[0] === i.YVal);
    if (found) found[found.length-1] += 1;
    
    found = raw.CSecVal.find(j => j[0] === i.CSecVal);
    if (found) found[found.length-1] += 1;
    
    found = raw.CComVal.find(j => j[0] === i.CComVal);
    if (found) found[found.length-1] += 1;
    
    found = raw.YMarNSC.find(j => j[0] === i.YMarNSC);
    if (found) found[found.length-1] += 1;
    
    found = raw.CGrValCot.find(j => j[0] === i.CGrValCot);
    if (found) found[found.length-1] += 1;
  });
  Object.keys(raw).forEach(k => {
    raw[k] = raw[k].filter(j => j[j.length-1] > 0);
  });
  
  let sorter;
  if (idSort) {
    const str = ''+idSort;
    const match = str.match(/^(\d)_?$/);
    if (match) {
      const n = +match[1];
      const asc = /_/.test(str) ? true : false;
      sorter = asc
        ? (a,b) => typeof a[n]==='number' ? a[n] - b[n] : a[n].localeCompare(b[n], 'fa')  // ascending
        : (a,b) => typeof a[n]==='number' ? b[n] - a[n] : b[n].localeCompare(a[n], 'fa'); // descending
    }
  }
  
  const print = (list, header) => {
    if (csv) {
      const csvstr = [header, ...list].map(i=> i.join(',')).join('\n');
      log(BOM + csvstr);
    } else if (json) {
      const jsonstr = JSON.stringify([header, ...list]);
      log(jsonstr);
    } else {
      printTable(list, header);
    }
  };
  
  if (idSymbolType) {
    const rdy = raw.YVal.map(([id,group,desc,count]) => [id, count, group, desc]).sort(sorter);
    print(rdy, ['id','count','group','desc']);
  }
  
  if (idIndustrySectorCode) {
    const rdy = raw.CSecVal.map(([id,desc,count]) => [id.trimEnd(),count,desc]).sort(sorter);
    print(rdy, ['id','count','desc']);
  }
  
  if (idMarket) {
    const rdy = raw.Flow.map(([id,desc,count]) => [id,count,desc]).sort(sorter)
    print(rdy, ['id','count','desc']);
  }
  
  if (idBoardCode) {
    const rdy = raw.CComVal.map(([id,desc,count]) => [id,count,desc]).sort(sorter);
    print(rdy, ['id','count','desc']);
  }
  
  if (idMarketCode) {
    const rdy = raw.YMarNSC.map(([id,desc,count]) => [id,count,desc]).sort(sorter);
    print(rdy, ['id','count','desc']);
  }
  
  if (idSymbolGroupCode) {
    const rdy = raw.CGrValCot.map(([id,desc,count]) => [id,count,desc]).sort(sorter);
    print(rdy, ['id','count','desc']);
  }
}
