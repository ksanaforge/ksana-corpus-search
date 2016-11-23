const createTokenizer=require("ksana-corpus/tokenizer").createTokenizer;
var tokenizers={};
const getTokenizer=function(version){
	if (!tokenizers[version]) {
		tokenizers[version]=createTokenizer(version);
	}
	return tokenizers[version];
}

module.exports=getTokenizer