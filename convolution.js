const bsearch=require("ksana-corpus/bsearch");

const groupByLine=function(res,kposs){
	var matches=res.map(function(r,idx){
			return [kposs[idx],r[1]];
	});
	const byline={};
	matches.forEach(function(m){
		const kpos=m[0];
		if (!byline[kpos]) byline[kpos]=0;
		byline[kpos] += m[1];
	});

	var out=[];
	for (var kpos in byline) {
		out.push([kpos,byline[kpos]]);
	}

	out.sort(function(a,b){return b[1]-a[1];});

	if (out.length>15) out.length=15;
	return out;
}

const mergePosting=function(postings){
	var o=[];
	var t=new Date();
	for (var i=0;i<postings.length;i++) {
		o=o.concat(postings[i]);
	}
	o.sort(function(a,b){return a-b});
	return o;　
}

const convolutePosting=function(posting, windowsize,threshold){
	var out=[];
	var t=new Date();
	
	for (var i=0;i<posting.length;i++) {
		var j=1,sum=0;
		while (j<windowsize&& posting[i+j]-posting[i]<windowsize ) {
			sum++;
			j++;
		}
		if (sum>threshold) out.push([posting[i],sum]);
	}
	out.sort(function(a,b){return b[1]-a[1]});
	return out;
}

const preparetokens=function(res,tokens){
		const alltokens=res[0],posting_length=res[1];
		var tokenid_len=[],tokenexists={};;

		tokens.forEach(function(tk,idx){
			const at= bsearch(alltokens,tk);
			if (at>-1) {
				if (!tokenexists[tk]) {
					tokenid_len.push([at, posting_length[at],tk]);
					tokenexists[tk]=true;
				}
			}
			if (idx) {
				const bigram=tokens[idx-1]+tk;
				const at2= bsearch(alltokens,bigram);
				if (at2>-1 && alltokens[at2]==bigram) {
					if (!tokenexists[bigram]) {
						tokenid_len.push([at2,posting_length[at2],bigram]);
						tokenexists[bigram]=true;
					}
				}
			}
		});
		
		tokenid_len=tokenid_len.filter(function(t){return t[0]!==-1});
		return tokenid_len;
}
const convolutionSearch=function(cor,query,opts,cb){
	const r=cor.tokenizer.tokenize(query);
	const tokens=r.map(function(tk){return tk[0]});
	var timer={},t=new Date();
	var t1=t;
	dosearch=function(res){
		tokenid_len=preparetokens(res,tokens);
		const totalpostinglength= tokenid_len.reduce(function(n,v){ return n+v[1] } , 0);
		const averagepostinglength=totalpostinglength/tokenid_len.length;

		tokenid_len.sort(function(t1,t2){return t2[1]-t1[1]});

		//remove common words
		for (var i=0;i<tokenid_len.length;i++) {
			if (tokenid_len[0][1] < averagepostinglength*2) break;
			tokenid_len.shift();
		}
		const terms=tokenid_len.map(function(tk){return tk[2]}).join(" ");
		const postingkeys=tokenid_len.map(function(tk){return ["inverted","postings",tk[0]]});
		
		cor.get(postingkeys,function(postings){
			timer.loadposting=new Date()-t1;t1=new Date();
			const hits=mergePosting(postings);
			timer.mergeposting=new Date()-t1;t1=new Date();
			const candidates=convolutePosting(hits, tokens.length, tokenid_len.length/2 );
			timer.convolution=new Date()-t1;t1=new Date();
			const tposs=candidates.map(function(r){return r[0]});
			cor.fromTPos(tposs,function(kposs){
				timer.tokpos=new Date()-t1;t1=new Date();
				const matches=groupByLine(candidates,kposs);
				timer.total=new Date()-t;
				cb&&cb({matches, timer , terms, hits: hits.length});
			})
		})
	}
	cor.get([["inverted","tokens"],["inverted","posting_length"]],dosearch);
}
module.exports=convolutionSearch;