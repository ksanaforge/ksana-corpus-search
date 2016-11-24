const bsearch=require("ksana-corpus/bsearch");
const MAX_CANDIDATE=50, BOOST_RATE=1.15;

const groupByLine=function(res,kposs){ 
	var byline={},out=[];
	var matches=res.map(function(r,idx){
			return [kposs[idx],r[1]];
	});
	matches.forEach(function(m){
		const kpos=m[0];
		if (!byline[kpos]) byline[kpos]=0;
		if (m[1]>byline[kpos]) byline[kpos]= m[1];
	});
	for (var kpos in byline) {
		out.push([kpos,byline[kpos]]);
	}
	out.sort(function(a,b){return b[1]-a[1];});
	if (out.length>MAX_CANDIDATE) out.length=MAX_CANDIDATE;
	return out;
}

const mergePosting=function(postings){
	//slightly faster than concat one by one
	var o=[].concat.apply([], postings); 
	return o.sort(function(a,b){return a-b});
}

const convolutePosting=function(posting, windowsize,threshold){
	var out=[], t=new Date();	
	for (var i=0;i<posting.length;i++) {
		var j=1,sum=0;
		while (j<windowsize&& posting[i+j]-posting[i]<windowsize ) {
			sum++;
			j++;
		}
		if (sum>threshold) out.push([posting[i],sum]);
	}
	out.sort(function(a,b){return b[1]-a[1]});
	if (out.length>MAX_CANDIDATE) out.length=MAX_CANDIDATE;
	return out;
}
const boostCandidate=function(candidates, windowsize,postings){
	for (var i=0;i<candidates.length;i++) {
		var score=1;
		const tpos=candidates[i][0]+windowsize;
		for (var j=0;j<postings.length;j++) {
			const posting=postings[j];
			const at=bsearch(posting,tpos,true);
			if (tpos-posting[at-1]<=windowsize) { // is this term in range?
				score*=BOOST_RATE;
			}
		}
		candidates[i][1]*=score;
	}
	return candidates;
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
	var timer={},t=new Date(),t1=t;
	cor.get([["inverted","tokens"],["inverted","posting_length"]],function(res){
		tokenid_len=preparetokens(res,tokens);
		const totalpostinglength= tokenid_len.reduce(function(n,v){ return n+v[1] } , 0);
		const averagepostinglength=totalpostinglength/tokenid_len.length;

		tokenid_len.sort(function(t1,t2){return t2[1]-t1[1]});//sort by posting length
		
		for (var i=0;i<tokenid_len.length;i++) {//remove high freqeuncy terms
			if (tokenid_len[0][1] < averagepostinglength*2) break;
			tokenid_len.shift();
		}
		const postingkeys=tokenid_len.map(function(tk){return ["inverted","postings",tk[0]]});
		const threshold=Math.floor(tokenid_len.length/2); //need at least 1/2 of token match to pass
		const windowsize=Math.floor(tokens.length*1.2); //allowing some "noise"
		
		cor.get(postingkeys,function(postings){
			timer.loadposting=new Date()-t1;t1=new Date();
			const hits=mergePosting(postings);
			timer.mergeposting=new Date()-t1;t1=new Date();
			var candidates=convolutePosting(hits, windowsize, threshold );
			candidates=boostCandidate(candidates,windowsize,postings);
			timer.convolution=new Date()-t1;t1=new Date();			
			const tposs=candidates.map(function(r){return r[0]});
			cor.fromTPos(tposs,function(kposs){
				timer.tokpos=new Date()-t1;t1=new Date();
				const matches=groupByLine(candidates,kposs);
				timer.total=new Date()-t;
				const terms=tokenid_len.map(function(tk){return tk[2]}).join(" ");
				cb&&cb({matches, timer , terms, hits: hits.length});
			})
		})
	})
}
module.exports=convolutionSearch;