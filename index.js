/*
//search phase
	tokenize q
	expand token 
	load postings of each token
	merge into phrase (phrase=chinese word)  

	grouping  ( by article, toc tree) //convert tpos to kpos ?
	sorting

	input: search result and start/end kpos (might cross book),
	limit output to 10 articles

	UI: ExcerptList

*/
const bsearch=require("ksana-corpus/bsearch");

const breakIntoPhrases=function(query){
	const parts=query.split(/(".+?")/g);
	var out=[];
	for (let i=0;i<parts.length;i++) {
		var part=parts[i];
		if (part[0]=='"') {
			out.push(part.substr(1,part.length-2));
		} else {
			out=out.concat( part.split(/([ !]+)/g));
		}
	}
	out=out.filter(function(o){return o.trim().length});
	return out;
}
const parsePhrase=function(phrases){
	//simple, wildcard, tokencount , 
	//
}
const expandtoken=function(){
	//expand each token to variants
	// tokens:["a",["v1","v2"], "a", 20, -10 ] //negative for ?, positive for *

}
const parseQuery=function(cor,query) {
	var phrases=breakIntoPhrases(query);
	
	//var r=tokenizer.tokenize(query)
	console.log(phrases)
	//const parts=query.split(/([])/);
	//tokenize query
	//single phrase query
	  //simple phrase without wildcard (fix length)
	  //with wirldcard (variable length)

	//multi phrase query
	// and, andnot
	//phrase with wildcard
	

//  phrase posting: array of tpos
//  phrase length : number || array of number

}
const exactSearch=function(cor,query,opts){
	const phrases=parseQuery(cor,query);
	console.log("search",phrases);
}

const convolutionSearch=require("./convolution");

module.exports={exactSearch:exactSearch,convolutionSearch:convolutionSearch,
	breakIntoPhrases:breakIntoPhrases};