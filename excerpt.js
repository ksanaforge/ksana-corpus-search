/*given match posting and phrase postings, return 
excerpt text and kpos and highlighting */
const plist=require("./plist");
const bsearch=require("ksana-corpus/bsearch");
const fetchExcerpts=function(cor,opts,cb){
	cor.fromTPos(opts.tpos,{line:opts.line},function(res){
		const linekrange=res.linekrange,kpos=res.kpos,linetpos=res.linetpos;
		cor.getText(linekrange,function(texts){
			var out=[];
			for (var i=0;i<texts.length;i++){
				var phrasehits=[];
				const startkpos=cor.parseRange(linekrange[i]).start;
				const layout=cor.layoutText(texts[i],startkpos);
				if (opts.phrasepostings) { //trim posting and convert to kpos
					opts.phrasepostings.forEach(function(item) { 
						const posting=plist.trim(item.postings,linetpos[i][0],linetpos[i][1]);
						const hitat=bsearch(layout.linebreaks,kpos[i]);
						const linetext=layout.lines[hitat];
						const hits=cor.fromTPos(posting,{linetext:linetext}).kpos;
						phrasehits.push( {phrase:item.phrase, hits:hits, lengths:item.lengths});
					});
				}
				out.push({rawtext:texts[i],text:layout.lines.join("\n"),
					linebreaks:layout.linebreaks,linetpos:linetpos[i],phrasehits:phrasehits});
			}
			cb(out);
		})
	});
}
module.exports={fetchExcerpts:fetchExcerpts};