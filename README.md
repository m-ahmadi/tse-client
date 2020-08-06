[![NPM](https://nodei.co/npm/tse-client.png)](https://nodei.co/npm/tse-client/)  
# TSE Client
A client for receiving stock data from the Tehran Stock Exchange (TSE).  
This is a port of the [official Windows app](http://cdn.tsetmc.com/Site.aspx?ParTree=111A11).

### Install
```shell
npm install tse-client -g
```

### CLI usage
First thing to do after install:
```shell
tse --update-instruments
```

#### Basic
```shell
tse --update-instruments
tse select فولاد ذوب
tse --update-prices
tse export --out-dir /path/to/dir
```

#### Select columns
```shell
tse select -c "6,7,8,9,10"
tse export --out-dir /path/to/dir
```

#### Select columns and specify their headers
```shell
tse select -c "6,OPEN 7,HIGH 8,LOW 10,CLOSE"
tse export --out-dir /path/to/dir
```

#### Export options
```shell
tse export -h
tse export --out-dir /path/to/dir --adjust-prices 2 --file-extension txt --encoding utf8
```