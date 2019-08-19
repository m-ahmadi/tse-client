const Base64 = require('js-base64').Base64;
const pako = require('pako');

function bytesToStr(arr) {
	let str = "";
	arr.forEach(i => str += String.fromCharCode(i));
	return str;
}

function bitConverterGetBytes(num) {
	let bits = "";
	[...Array(Math.clz32(num))].forEach(()=> bits += "0");
	bits += num.toString(2);
	const byteArr = [];
	for (let i=32; i>0; i-=8) {
		const bit = bits.substring(i, i-8);
		byteArr.push( parseInt(bit, 2) );
	}
	return new Uint8Array(byteArr);
}

function compress(text) {
	var bytes = [...text].map(c => c.charCodeAt(0) & 255);
	var bytesTA = new Uint8Array(bytes);
	
	var numBytes = bitConverterGetBytes(bytesTA.length);
	
	var pakoGziped = pako.gzip(bytesTA, { strategy: 2, header: {os: 0} });
	
	var merged = new Uint8Array(numBytes.length + pakoGziped.length);
	merged.set(numBytes)
	merged.set(pakoGziped, numBytes.length)
	
	var str = bytesToStr(merged);
	return Base64.btoa(str);
}

module.exports = compress;