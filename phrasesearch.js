/**/


const convolutionSearch=require("./convolution").convolutionSearch;
const plist=require("./plist");
const normalize=require("ksana-corpus/diacritics").normalize;
const enumBigram=function(cor,t1,t2){
	var v1=cor.expandVariant(t1);
	var v2=cor.expandVariant(t2);
	var out=[];
	if (v1==t1) v1=[t1];
	if (v2==t2) v2=[t2];
	for (var i=0;i<v1.length;i++) {
		for (var j=0;j<v2.length;j++) {
			out.push(v1[i]+v2[j]);
		}
	}
	return out;
}
// 發菩提心   ==> 發菩  提心       2 2   
// 菩提心     ==> 菩提  心         2 1
// 因緣所生法  ==> 因緣  所生   法  2 2 1
// 民國五     ==  民國  五         2 1
var splitPhrase=function(cor,simplephrase) {
	const TokenTypes=cor.tokenizer.TokenTypes;
	const PUNC=TokenTypes.PUNC;
	const LATIN=TokenTypes.LATIN;
	const SPACE=TokenTypes.SPACE;

	var alltokens=cor.get(["inverted","tokens"])||[];
	var tokens=cor.tokenizer.tokenize(simplephrase);

	while (tokens.length&& tokens[0]&&tokens[0][2]==PUNC) {
		tokens.shift();
	}
	while (tokens.length&& tokens[tokens.length-1]&&
		tokens[tokens.length-1][2]==PUNC) {
		tokens.pop();
	}

	for (var i=0;i<tokens.length;i++) {
		if (tokens[i][2]===LATIN) {
			tokens[i][0]=normalize(tokens[i][0]).toLowerCase();
		}
	}

	tokens=tokens.filter(function(tk){return tk[2]!==PUNC && tk[2]!==SPACE});
	var loadtokens=[],lengths=[],j=0,lastbigrampos=-1;

	var putUnigram=function(token){
		var variants=cor.expandVariant(token);
		if (variants instanceof Array) {
			variants=variants.filter(function(v){
				const at=plist.indexOfSorted(alltokens,v);
				return (at>-1 && alltokens[at]==v);
			});			
			if (variants.length==1) variants=variants[0];
		}
		loadtokens.push(variants);
		lengths.push(1);				
	}

	while (j+1<tokens.length) {
		var token=tokens[j][0];
		var nexttoken=tokens[j+1][0];
		const possiblebigrams=enumBigram(cor,token,nexttoken);
		const bi=[];
		for (var k=0;k<possiblebigrams.length;k++) {
			var i=plist.indexOfSorted(alltokens,possiblebigrams[k]);
			if (alltokens[i]===possiblebigrams[k]) {
				bi.push(possiblebigrams[k]);
			}
		}
		if (bi.length)  {
			bi.length==1?loadtokens.push(bi[0]):loadtokens.push(bi);
			lengths.push(2);
			j++;
		} else {
			putUnigram(token);
		}
		j++;
	}

	var totallen=lengths.reduce(function(r,a){return r+a},0);
	while (totallen<tokens.length) {
		token=tokens[j][0];
		putUnigram(token);
		j++;
		totallen++;
	}
	return {tokens:loadtokens, lengths: lengths , 
		tokenlength: tokens.length};
}

const nativeMergePostings=function(cor,paths,cb){
	cor.get(paths,{address:true},function(postingAddress){ //this is sync
		var postingAddressWithWildcard=[];
		for (var i=0;i<postingAddress.length;i++) {
			postingAddressWithWildcard.push(postingAddress[i]);
			if (splitted.lengths[i]>1) {
				postingAddressWithWildcard.push([splitted.lengths[i],0]); //wildcard has blocksize==0 
			}
		};
		cor.mergePostings(postingAddressWithWildcard,function(r){
			cor.cachedPostings[phrase]=r;
			cb(phrase_term);
		});
	});	
}
var postingPathFromTokens=function(engine,tokens) {
	if (typeof tokens=="string") tokens=[tokens];
	const alltokens=engine.get(["inverted","tokens"]);
	var postingid=[];
	for (var i=0;i<tokens.length;i++) {
		const at=plist.indexOfSorted(alltokens,tokens[i]);
		if (at>-1 && alltokens[at]==tokens[i]) postingid.push(at);
	}
	return postingid.map(function(t){return ["inverted","postings",t]});
}

const getPostings=function(cor,tokens,cb){
	var paths=[];
	const out=[];
	for (var i=0;i<tokens.length;i++){
		const token=tokens[i];
		const path=postingPathFromTokens(cor,token);
		if (path.length==1) {
			out.push([token,1]); //posting count =1
			paths.push(path[0]);
		} else { //need to merge postings
			const cached=cor.cachedPostings[token];			
			if (cached) {
				out.push([token,cached]);
			} else {
				out.push([token,path.length]); //posting count
				paths=paths.concat(path);
			}
		}
	}

	cor.get(paths,function(postings){ 
		var now=0,i=0;
		for (var i=0;i<out.length;i++) {
			const postingcount=out[i][1];
			if (postingcount instanceof Array) {
				continue;//from cache
			}

			const tokenpostings=[];
			for (var j=0;j<postingcount;j++) {
				tokenpostings.push(postings[now]);
				now++;
			}
			const combined=plist.combine(tokenpostings);
			const key=out[i][0];
			if (tokenpostings.length>1) {
				cor.cachedPostings[key.join(",")]=combined;	
			}
			out[i][1]=combined;
		}

		const outtokens=out.map(function(o){return o[0]});
		const outpostings=out.map(function(o){return o[1]});
		cb(outtokens,outpostings);
	});
}
const simplePhrase=function(cor,phrase,cb){
	const splitted=splitPhrase(cor,phrase.trim());
	if (cor.mergePostings) { //native search doesn't support variants
		var paths=postingPathFromTokens(cor,splitted.tokens);
		nativeMergePosting(cor,paths,cb);
		return;
	}
	getPostings(cor,splitted.tokens,function(tokens,postings){
		var out=postings[0],dis=splitted.lengths[0];
		for (var i=1;i<postings.length;i++) {
			var post=postings[i];
			out=plist.pland(out,post,dis);
			dis+=splitted.lengths[i];
		}
		cor.cachedPostings[phrase]=out;
		cb({phrase:phrase,postings:out,lengths:splitted.tokenlength}); //fix length
	});		
}
//如夢幻泡沫。
const fuzzyPhrase=function(cor,phrase,cb){
	//return postings and lengths and score
	phrase=phrase.replace(/[　 ]/g,"");
	convolutionSearch(cor,phrase,{},function(res){
		const matches=res.matches.map(function(a){return a[0]});
		const scores=res.matches.map(function(a){return a[1]});
		cb({scores:scores,matches:matches,phrasepostings:res.phrasepostings,
			count:res.matches.length,phrase:phrase,lengths:0,fuzzy:true});
	});
}

module.exports={simplePhrase:simplePhrase,fuzzyPhrase:fuzzyPhrase}