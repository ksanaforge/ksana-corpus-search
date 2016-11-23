const tokenizers=require("./tokenizers");
const bsearch=require("ksana-corpus/bsearch");
const reduce=function(arr,weights) {
	var out=[];
	for(let i=0;i<arr.length;i++) {
		const a=arr[i],w=weights[i];
		for (let j=0;j<a.length;j++) {
			const blk=Math.floor(a[j]/wsz);
			if (!out[blk]) out[blk]=0;
			out[blk]+=w;
		}
	}	
	return out;
}
const convoluteBlocks=function(blocksum,qwcount,maxblockcount){
	var convolute=0,out=[];

	var threshold=qwcount*wsz / 5;
	threshold=threshold*threshold;
	for (let i=0;i<qwcount;i++) convolute+= (blocksum[i]||0)*(blocksum[i]||0);

	for (let i=qwcount;i<maxblockcount;i++) {
		if (convolute>threshold) {
			var at=(i>qwcount)?i-qwcount:i;
			out.push([at*wsz,convolute]);
		}
		convolute-=(blocksum[i-qwcount]||0) *(blocksum[i-qwcount]||0);
		convolute+= (blocksum[i]||0)*(blocksum[i]||0);
	}
	return out;
}
const maxtpos=function(postings){
	var maxtpos=0;
	for (let i=0;i<postings.length;i++) {
		const p= postings[i];
		if (p[p.length-1]>maxtpos) maxtpos=p[p.length-1];
	}	
	return maxtpos;
}

const wsz=8; //default window size

const termWeight=function(postings)	{
	var out=[];
	const length=postings.reduce( function(a,p){return a+p.length},0);
	out=postings.map( function(p){
		const r=(length-p.length)/length;
		return r*r;
	});
	return out;
}
const blockScore=function(postings,tokenlength) {
	const max=maxtpos(postings);
	const weights=termWeight(postings)
	var qwcount= Math.floor(postings.length/wsz); //how many window in the query
	if (postings.length%wsz!==0) qwcount++;
	var filtersize=Math.floor(tokenlength/wsz);
	if (tokenlength%wsz!==0) filtersize++;
	//console.log('filtersize',filtersize,wsz,tokenlength,postings.length);

	const blocks=reduce(postings,weights);
	var r=convoluteBlocks(blocks, filtersize ,Math.floor(max/wsz)+1);
	r.sort(function(a,b){return b[1]-a[1]});
	return r;
}

const groupByLine=function(res,kposs){
	var matches=res.map(function(r,idx){
			return [kposs[idx],r[1]];
	});

	const byline={};
	matches.forEach(function(m){
		const kpos=m[0];
		if (!byline[kpos]) byline[kpos]=0;
		byline[kpos] += m[1]*m[1]*m[1];
	});

	var out=[];
	for (var kpos in byline) {
		out.push([kpos,byline[kpos]]);
	}

	out.sort(function(a,b){return b[1]-a[1];});

	if (out.length>15) out.length=15;
	return out;
}
const convolutionSearch=function(cor,query,opts,cb){
	const tokenizer=tokenizers(cor.meta.versions.tokenizer);
	const r=tokenizer.tokenize(query);
	const tokens=r.map(function(tk){return tk[0]});
	var t=new Date();
	dosearch=function(res){
		
		const alltokens=res[0],posting_length=res[1];
		var totalpostinglength=0;

		var tokenid_len=tokens.map(function(tk){
			const at= bsearch(alltokens,tk);
			const len=posting_length[at];
			return [at,len,tk]
		});
		
		tokenid_len=tokenid_len.filter(function(t){return t[0]!==-1});
		totalpostinglength= tokenid_len.reduce(function(n,v){ return n+v[1] } , 0);
		console.log(totalpostinglength)

		tokenid_len=tokenid_len.map(function(t){return [t[0],t[1],t[2],t[1]/totalpostinglength]});

		tokenid_len.sort(function(t1,t2){return t2[1]-t1[1]});

		var acc=0;	//remove common words
		for (let i=0;i<tokenid_len.length;i++) {
			acc+=tokenid_len[i][3];
			tokenid_len.shift();
			if (acc>0.5) break;
		}

		const postingkeys=tokenid_len.map(function(tk){return ["inverted","postings",tk[0]]});

		cor.get(postingkeys,function(postings){
			console.log("fetch data time",new Date()-t);
			t=new Date();
			var res=blockScore(postings,tokens.length); //array of [tpos, score]
			const tposs=res.map(function(r){return r[0]});

			cor.fromTPos(tposs,function(kposs){
				const matches=groupByLine(res,kposs);
				cb&&cb({matches, convolute_time:new Date()-t});
			})
		})
	}

	cor.get([["inverted","tokens"],["inverted","posting_length"]],dosearch);
}
module.exports=convolutionSearch;