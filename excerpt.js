/*given match posting and phrase postings, return 
excerpt text and kpos and highlighting */
const plist=require("./plist");
const bsearch=require("ksana-corpus").bsearch;
const fetchExcerpts=function(cor,opts,cb){
	/*
	  hits are return as Token Position (tpos), convert to Ksana Position for highlighting
		first phrase, get tpos of lines containing opts.tpos
		second phrase , get the text
		third phrase , calcuate exact character position (kpos) of each hit.
	*/
	cor.fromTPos(opts.tpos,{line:opts.line||1},function(res){
		if (!res) {
			cb&&cb(null);
			return;
		}
		const linekrange=res.linekrange,kpos=res.kpos,linetpos=res.linetpos;

		cor.getText(linekrange,function(texts){
			var out=[];
			for (var i=0;i<texts.length;i++){
				var phrasehits=[];
				const startkpos=cor.parseRange(linekrange[i]).start;
				const layout=cor.layoutText(texts[i],startkpos,null,linetpos[i]);
				if (opts.phrasepostings) { //trim posting and convert to kpos
					opts.phrasepostings.forEach(function(item) { 
						var tposstart=linetpos[i][0];
						const tposend=linetpos[i][linetpos[i].length-1];
						var ii=i;
						while (!tposstart && i<linetpos.length) {
							tposstart=linetpos[++i][0];
						}
						const posting=plist.trim(item.postings,tposstart,tposend);
						const hits=cor.fromTPos(posting,{linetext:layout.lines, linetpos:layout.linetpos}).kpos;
						const endposting=posting.map(function(p,idx){
							return p+(item.lengths[idx]||item.lengths);
						})
						const hitsend=cor.fromTPos(endposting,{linetext:layout.lines, linetpos:layout.linetpos}).kpos;
						phrasehits.push( {phrase:item.phrase, hits:hits,hitsend:hitsend, lengths:item.lengths});
					});
				}
				out.push({rawtext:texts[i],text:layout.lines.join("\n"),
					linebreaks:layout.linebreaks,
					linetpos:layout.linetpos,phrasehits:phrasehits});
			}
			cb(out);
		})
	});
}
module.exports={fetchExcerpts:fetchExcerpts};