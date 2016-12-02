const bsearch=require("ksana-corpus/bsearch");
const convolutionSearch=require("./convolution").convolutionSearch;
const reducePostings=require("./convolution").reducePostings;
const postingToKPos=require("./utils").postingToKPos;
const phraseSearch=require("./phrasesearch");
const breakIntoPhrases=function(query){
	const parts=query.split(/(".+?")/g);
	var out=[];
	for (var i=0;i<parts.length;i++) {
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
const expandtoken=function(){
	//expand each token to variants
	// tokens:["a",["v1","v2"], "a", 20, -10 ] //negative for ?, positive for *
}
const parseQuery=function(cor,query) {
	var phrases=breakIntoPhrases(query);
	return phrases;
}
const phraseType=function(cor,phrase){
	const tokenTypes=cor.tokenizer.tokenTypes;
	const res=cor.tokenizer.tokenize(phrase);
	const haspunc=res.filter((t)=>t[3]==cor.PUNC).length;
	if (haspunc || res.length>=8) {
		return phraseSearch.fuzzyPhrase;
	}
	return phraseSearch.simplePhrase;
}
const search=function(cor,query,opts,cb){
	if (typeof opts=="function") cb=opts;
	const phrases=parseQuery(cor,query);
	var queue=[],phrasepostings=[], t=new Date(), t1=t,timer={};
	for (var i=0;i<phrases.length;i++) {
		const searcher=phraseType(cor,phrases[i]);
		queue.push( (function(s,phrase){
				return function(res){
						if (typeof res=='object' && res.__empty) {
						}	else phrasepostings.push(res);
						s(cor,phrase,queue.shift());
					}
			})(searcher, phrases[i])
		);
	}
	queue.push( function(res){
		timer.postings=new Date()-t1; t1=new Date();

		phrasepostings.push(res);
		var candidates=null,matchcount=0;
		if (phrasepostings.length>1) {
			const postings=phrasepostings.map(function(item){return item.postings});
			candidates=reducePostings(postings,{windowsize:query.length});
			matchcount=candidates.length;
		} else{
			if (!phrasepostings.length || !phrasepostings[0].postings){
				candidates=[];
			} else {
				matchcount=phrasepostings[0].postings.length;
				const out=phrasepostings[0].postings.slice(0,300);
				candidates=out;//no score, postingToKPos will add 1 as default score
			}
		}
		timer.reduce=new Date()-t1; t1=new Date();
		postingToKPos(cor,candidates,function(matches){
			timer.tokpos=new Date()-t1; t1=new Date();
			timer.total=new Date()-t;
			cb({matches:matches,matchcount:matchcount,phrasepostings:phrasepostings,timer:timer});
		});
	});
	queue.shift()({__empty:true});
}
module.exports={search:search,convolutionSearch:convolutionSearch,
	breakIntoPhrases:breakIntoPhrases};