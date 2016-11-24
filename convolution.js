const bsearch=require("ksana-corpus/bsearch");
const MAX_CANDIDATE=50, BOOST_RATE=1.1, MAX_TOKEN=50;
const WIN_EXPAND=1.5;

const preparetokens=function(alltokens,posting_length,tokens,maxtoken){
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
		if (tokenid_len.length>maxtoken) tokenid_len.length=maxtoken;
		return tokenid_len;
}

const combinePosting=function(postings){
	//slightly faster than concat one by one
	var o=[].concat.apply([], postings); 
	return o.sort(function(a,b){return a-b});
}
/*convolute scan posting and filter out noise by given threshold*/
const convolutePosting=function(posting, windowsize,threshold,maxcandidate){
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
	if (out.length>maxcandidate) out.length=maxcandidate;
	return out;
}
/* boosting the score of candidate by checking how many term found in scope*/
const boostCandidate=function(candidates, windowsize,postings,postingweight){
	for (var i=0;i<candidates.length;i++) {
		var matchcount=0,termscore=0;
		const tpos=candidates[i][0]+windowsize;
		
		for (var j=0;j<postings.length;j++) {
			const posting=postings[j];
			const at=bsearch(posting,tpos,true);
			if (tpos-posting[at-1]<=windowsize) { // is this term in range?
				matchcount++;
				termscore+=postingweight[j];
			}
		}
		candidates[i][1]*= Math.pow(BOOST_RATE,matchcount)* Math.sqrt(termscore);
	}
	return candidates;
}

/* reduce multiple posting to single posting */
const reducePostings=function(postings,opts){
		var t1=new Date();
		const totalpostinglength= postings.reduce(function(n,v){ return n+v.length } , 0);
		const averagepostinglength=totalpostinglength/postings.length;

		const hits=combinePosting(postings);	
		if(opts.timer) opts.timer.mergeposting=new Date()-t1;t1=new Date();
		opts=opts||{};
		if (!opts.postingweight) {
			opts.postingweight=[];
			for (var i=0;i<postings.length;i++ ){
				opts.postingweight[i]=Math.log(2+Math.log(2+averagepostinglength/postings[i].length));
			}
		}
		const maxcandidate=opts.maxcandidate||MAX_CANDIDATE;
		const windowsize=opts.windowsize||postings.length;
		const threshold=opts.threshold||postings.length/2;

		var candidates=convolutePosting(hits, windowsize, threshold,maxcandidate);
		candidates=boostCandidate(candidates,windowsize,postings,opts.postingweight);
		if(opts.timer) opts.timer.convolution=new Date()-t1;t1=new Date();
		return candidates;
}
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
	return out;
}
/* convert to kPos for final posting with optional score*/
const postingToKPos=function(cor,arr,cb){
	var candidates=arr;
	var tposs=arr;
	if (typeof tposs[0]!=="number") { //candidate format
		tposs=arr.map(function(r){return r[0]});
	} else {
		candidates=arr.map(function(a){return [a,1]});//same score for all posting
	}
	cor.fromTPos(tposs,function(kposs){
		const matches=groupByLine(candidates,kposs);
		cb(matches);
	});	
}
/*given a query, return tpos or kpos with score*/
const convolutionSearch=function(cor,query,opts,cb){
	const r=cor.tokenizer.tokenize(query);
	const tokens=r.map(function(tk){return tk[0]});
	var timer={},t=new Date(),t1=t;
	const maxtoken=opts.maxtoken||MAX_TOKEN;

	cor.get([["inverted","tokens"],["inverted","posting_length"]],function(res){
		const alltokens=res[0],posting_length=res[1];
		var tokenid_len=preparetokens(alltokens,posting_length,tokens,maxtoken);
		const totalpostinglength= tokenid_len.reduce(function(n,v){ return n+v[1] } , 0);
		const averagequerypostinglength=totalpostinglength/tokenid_len.length;
		const threshold=Math.floor(tokenid_len.length/2); //need at least 1/2 of token match to pass
		const windowsize=Math.floor(tokens.length*(opts.windowsize||WIN_EXPAND)); //allowing some "noise"

		tokenid_len.sort(function(t1,t2){return t2[1]-t1[1]});//sort by posting length
		
		for (var i=0;i<tokenid_len.length;i++) {//remove high freqeuncy terms
			if (tokenid_len[0][1] < averagequerypostinglength*2) break;
			tokenid_len.shift();
		}

		const postingkeys=tokenid_len.map(function(tk){return ["inverted","postings",tk[0]]});
		const terms=tokenid_len.map(function(tk){return tk[2]}).join(" ");

		cor.get(postingkeys,function(postings){
			timer.loadposting=new Date()-t1;t1=new Date();

			var options={timer:timer, maxcandidate:opts.maxcandidate,timer:timer
				,windowsize:windowsize,threshold:threshold};
			const candidates=reducePostings(postings, options);

			if (opts.tpos) {
				cb&&cb({matches:candidates,terms,timer,unit:"tpos"});
				return;
			}
			
			t1=new Date();
			postingToKPos(cor,candidates,function(matches){
				timer.tokpos=new Date()-t1;
				cb&&cb({matches:matches,terms,timer,unit:"kpos"});
			});
		})
	})
}
module.exports={convolutionSearch:convolutionSearch,reducePostings:reducePostings
,  postingToKPos:postingToKPos };