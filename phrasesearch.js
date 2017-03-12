/**/
const convolutionSearch=require("./convolution").convolutionSearch;
const plist=require("./plist");
// 發菩提心   ==> 發菩  提心       2 2   
// 菩提心     ==> 菩提  提心       1 2
// 劫劫       ==> 劫    劫         1 1   // invalid
// 因緣所生道  ==> 因緣  所生   道   2 2 1
var splitPhrase=function(cor,simplephrase) {
	var alltokens=cor.get(["inverted","tokens"])||[];

	var tokens=cor.tokenizer.tokenize(simplephrase);
	
	tokens=tokens.filter(function(tk){return tk[3]!=="P" && tk[3]!==" "});

	var loadtokens=[],lengths=[],j=0,lastbigrampos=-1;
	while (j+1<tokens.length) {
		var token=tokens[j][0];
		var nexttoken=tokens[j+1][0];
		var bi=token+nexttoken;
		var i=plist.indexOfSorted(alltokens,bi);
		if (alltokens[i]===bi) {
			loadtokens.push(bi);
			if (j+3<tokens.length) {
				lastbigrampos=j;
				j++;
			} else {
				if (j+2==tokens.length){ 
					if (lastbigrampos+1==j ) {
						lengths[lengths.length-1]--;
					}
					lastbigrampos=j;
					j++;
				}else {
					lastbigrampos=j;	
				}
			}
			lengths.push(2);
		} else {
			if (lastbigrampos==-1 || lastbigrampos+1!=j) {
				loadtokens.push(token);
				lengths.push(1);				
			}
		}
		j++;
	}
	while (j<tokens.length) {
		loadtokens.push(tokens[j][0]);
		lengths.push(1);
		j++;
	}
	return {tokens:loadtokens, lengths: lengths , tokenlength: tokens.length};
}

var postingPathFromTokens=function(engine,tokens) {
	const alltokens=engine.get(["inverted","tokens"]);
	var postingid=[];
	for (var i=0;i<tokens.length;i++) {
		const at=plist.indexOfSorted(alltokens,tokens[i]);
		if (at>-1 && alltokens[at]==tokens[i]) postingid.push(at);
	}
	return postingid.map(function(t){return ["inverted","postings",t]});
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
const simplePhrase=function(cor,phrase,cb){
	const splitted=splitPhrase(cor,phrase.trim());
	//phrase_term.width=splitted.tokenlength; //for excerpt.js to getPhraseWidth
	var paths=postingPathFromTokens(cor,splitted.tokens);

	if (cor.mergePostings) {
		nativeMergePosting(cor,paths,cb);
		return;
	}
	cor.get(paths,function(postings){ //this is sync
		var out=postings[0],dis=splitted.lengths[0];
		for (var i=1;i<postings.length;i++) {
			out=plist.pland(out,postings[i],dis);
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