const { readdirSync } = require('fs');
const { join } = require('path');
const { log } = console;

const c = {r:31,g:32,y:33,c:36};
Object.keys(c).forEach(k => String.prototype.__defineGetter__(k, function(){return `[${c[k]}m${this}[0m`}));

(async () => {
  let fail;
  
  const files = readdirSync(join(__dirname,'./')).filter(i=>!/^index|#/.test(i));
  for (const file of files) {
    log(file.y);
    let test, res, err;
    try {
      test = require( join(__dirname,file) );
      res = test.constructor.name === 'AsyncFunction' ? await test() : test();
      err = 0;
    } catch (e) {
      if (!fail) fail = 1;
      err = 1;
      log(e.stack.replace(/^(.)/gm,'\t$1').r);
      continue;
    }
    res.map((res,i) => log('\t', (i+1+'').c, res?'√'.g:'X'.r));
    if (!fail && res.filter(i=>!i).length) fail = 1;
  }
  
  if (fail) process.exitCode = 1;
})();