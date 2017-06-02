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
			var linetext=[], linestart;
			for (var i=0;i<res.kpos.length;i++) {
				var hitat=bsearch(linebreaks,res.kpos[i]);
				if (hitat==-1) {
					//hits at last line
					hitat=linebreaks.length-1;
				}
				if (i==0) linestart=linebreaks[hitat];
				linetext.push(lines[hitat]);
			}
			
			const hits=cor.fromTPos(posting,{linetext:linetext, linetpos:res.linetpos }).kpos;

			const endposting=posting.map(function(p,idx){
				return p+(item.lengths[i]||item.lengths);
			});

			// 若是有跨行, 則 linextext 也要重新取得, 不然跨行塗色會失敗
			const endres=cor.fromTPos(endposting,{});
			var endlinetext=[], linestart;
			for (var i=0;i<endres.kpos.length;i++) {
				var endhitat=bsearch(linebreaks,endres.kpos[i]);
				if (endhitat==-1) {
					//hits at last line
					endhitat=linebreaks.length-1;
				}
				if (i==0) linestart=linebreaks[endhitat];
				endlinetext.push(lines[endhitat]);
			}
			
			const hitsend=cor.fromTPos(endposting,{linetext:endlinetext, linetpos:endres.linetpos }).kpos;
			phrasehits.push({phrase:item.phrase, hits:hits, hitsend:hitsend,lengths:item.lengths, idx:idx});

		});
		cb(phrasehits);
	});
}

module.exports={getArticleHits:getArticleHits};
