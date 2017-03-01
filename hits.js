const plist=require("./plist");
const bsearch=require("ksana-corpus/bsearch");
const getHitTPosOfArticle=function(phrasepostings,article){
	var out=[];
	for (var i=0;i<phrasepostings.length;i++) {
		postings=phrasepostings[i].postings;
		if (postings) out=out.concat(plist.trim(postings,article.tstart,article.tend));
  }
  return out;
}
const getArticleHits=function(opts,cb){
	const searchresult=opts.searchresult;
	if (!searchresult || !searchresult.phrasepostings) {
		cb([]);
		return;
	}
	const cor=opts.cor, linebreaks=opts.linebreaks, pagebreaks=opts.pagebreaks, lines=opts.lines;
	const article=opts.article;
	
  var phrasehits=[];
  if (!searchresult.phrasepostings) {
  	cb(null);
  	return;
  }
  const tpos=getHitTPosOfArticle(searchresult.phrasepostings,article);

  cor.fromTPos(tpos,{},function(resall){ //the first call to fromTPos should be async, loading all line2tpos
  	if (!resall || !resall.kpos) {
  		cb(null);
  		return;
  	}
		searchresult.phrasepostings.forEach(function(item,idx) { 
			if (!item.postings)return;
			const posting=plist.trim(item.postings,article.tstart,article.tend);
			const res=cor.fromTPos(posting,{});
			var hits=[],linetext=[], linestart;
			for (var i=0;i<res.kpos.length;i++) {
				const hitat=bsearch(linebreaks,res.kpos[i]);
				if (i==0) linestart=linebreaks[hitat];
				linetext.push(lines[hitat]);
			}
			hits=cor.fromTPos(posting,{linetext:linetext, linetpos:res.linetpos }).kpos;
			phrasehits.push({phrase:item.phrase, hits:hits, lengths:item.lengths, idx:idx});
		});
		cb(phrasehits);
  });
}

module.exports={getArticleHits:getArticleHits};
