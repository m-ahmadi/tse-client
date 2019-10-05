# TSE Client
A client for receiving stock data from the Tehran Stock Exchange (TSE).

### Install
```shell
npm install tse-client -g
```

### CLI usage
First thing to do after install:
```shell
tc --update-instruments
```

#### Basic
```shell
tc --update-instruments
tc select فولاد ذوب
tc --update-prices
tc export --out-dir /path/to/dir
```

#### Select columns
```shell
tc select -c "6,7,8,9,10"
tc export --out-dir /path/to/dir
```

#### Select columns and specify their headers
```shell
tc select -c "6,OPEN 7,HIGH 8,LOW 10,CLOSE"
tc export --out-dir /path/to/dir
```

#### Export options
```shell
tc export -h
tc export --out-dir /path/to/dir --adjust-prices 2 --file-extension txt --encoding utf8
```