const bsearch=require("ksana-corpus").bsearch;
const convolutionSearch=require("./convolution").convolutionSearch;
const strstr=require("./strstr").indexOf;
const reducePostings=require("./convolution").reducePostings;
const postingToKPos=require("./utils").postingToKPos;
const getArticleHits=require("./hits").getArticleHits;
const phraseSearch=require("./phrasesearch");
const plist=require("./plist");
const excerpt=require("./excerpt");
const grouping=require("./grouping");
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
const parseQuery=function(cor,query) {
	var phrases=breakIntoPhrases(query);
	return phrases;
}
const phraseType=function(cor,phrase){
	const TokenTypes=cor.tokenizer.TokenTypes;
	const res=cor.tokenizer.tokenize(phrase);
	const PUNC=TokenTypes.PUNC;
	const haspunc=res.filter(function(t){return t[3]==PUNC}).length;
	if (haspunc || res.length>=15) {
		return phraseSearch.fuzzyPhrase;
	}
	return phraseSearch.simplePhrase;
}
const search=function(cor,query,opts,cb){
	if (typeof opts=="function") cb=opts;
	const phrases=parseQuery(cor,query);
	var matches=[],queue=[],phrasepostings=[], t=new Date(), t1=t,timer={};

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
		if (res.__empty) { //empty search
			cb({matches:[],count:0,phrasepostings:[],timer:{}});
			return;
		}
		if (res.fuzzy) { //only accept one fuzzy phrase
			cb(res);
			return;
		}
		phrasepostings.push(res);
		var candidates=null,matchcount=0;
		if (phrasepostings.length>1) {
			const postings=phrasepostings.map(function(item){return item.postings});
			matches=plist.plmerge(postings,100);
			count=matches.length;
		} else{
			if (!phrasepostings.length || !phrasepostings[0].postings){
				count=0;
			} else {
				count=phrasepostings[0].postings.length;
				matches=phrasepostings[0].postings;
			}
		}
		timer.reduce=new Date()-t1; t1=new Date();
		cb({matches:matches,count:count,phrasepostings:phrasepostings,timer:timer});
	});
	queue.shift()({__empty:true});
}

module.exports={search:search,convolutionSearch:convolutionSearch,
	breakIntoPhrases:breakIntoPhrases,excerpt:excerpt,strstr:strstr,
	groupStat:grouping.groupStat,filterMatch:grouping.filterMatch,getArticleHits:getArticleHits};