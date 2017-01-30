const plist=require("./plist");
const bsearch=require("ksana-corpus/bsearch");

const getArticleHits=function(opts,cb){
	const searchresult=opts.searchresult;
	if (!searchresult || !searchresult.phrasepostings) {
		cb([]);
		return;
	}

	const cor=opts.cor, linebreaks=opts.linebreaks, pagebreaks=opts.pagebreaks, lines=opts.lines;
	const article=opts.article;
	
  var phrasehits=[];
  const tpos=plist.trim(searchresult.matches,article.tstart,article.tend);

  cor.fromTPos(tpos,{},function(res){

  	if (!res || !res.kpos) {
  		cb(null);
  		return;
  	}
  	const kpos=res.kpos;
  	
		searchresult.phrasepostings.forEach(function(item,idx) { 
			const posting=plist.trim(item.postings,article.tstart,article.tend);
			var hits=[],linetext=[], linestart;
			for (var i=0;i<kpos.length;i++) {
				const hitat=bsearch(linebreaks,kpos[i]);
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
