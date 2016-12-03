/*given match posting and phrase postings, return 
excerpt text and kpos and highlighting */
const fetchExcerpts=function(cor,opts,cb){
	cor.fromTPos(opts.tpos,{line:3},function(res){
		const {krange,kpos,linetpos}=res;
		cor.getText(krange,function(texts){
			var out=[];
			for (var i=0;i<texts.length;i++){
				//get begining of lines
				const startkpos=cor.parseRange(krange[i]).start;
				const layout=cor.layoutText(texts[i],startkpos);
				out.push({text:layout.lines.join("\n"),
					linebreaks:layout.linebreaks,linetpos:linetpos[i]});
			}
			cb(out);
		})
	});
}
module.exports={fetchExcerpts};