const WIN_EXPAND=1.2; //window expansion ratio
const convolute=function(T,terms,threshold,windowsize){
	var score=0, out=[];
	for (var i=0;i<windowsize;i++) {
		const t=T[i][0];
		if (terms[t]) {
			score++;
		}
	}

	for (var i=windowsize;i<T.length;i++) {
		const head=T[i][0], tail=T[i-windowsize][0]; //the term at i
		if ( terms[head]) score++;  //if the term exists in query
		if (i-windowsize>=0 && terms[tail] ) score--; //term slip out of window

		if (score<threshold) continue; 

		var at=i-windowsize;
		if (at<0) at=0;
		const prev=out[out.length-1];
		if (prev && at-prev[0]<windowsize ) { //close enought to previous candidate
			if (score>prev[1]) { //update to better score
				out[out.length-1][0]=at;
				out[out.length-1][1]=score;
			}
		} else {
			out.push([at,score]); //we have a candidate
		}
	}
	if (!out.length)return out;

	// out is an array of [token id, score]
	out.sort(function(a,b){return b[1]-a[1]});

	//only keep result close enough to best score
	const bestscore=out[0][1];
	for (var i=1;i<out.length;i++) {
		if (bestscore>out[i][1]*1.1) break;
	}
	return out.slice(0,i);
}
/* trim out non relavent characters
convert candidate from token id to string index*/
const candidatesToStringIndex=function(candidates,T,terms,windowsize){
	const out=[];
	for (var i=0;i<candidates.length;i++) {
		const candidate=candidates[i];
		var begin=candidate[0],end=candidate[0]+windowsize;
		while ( !terms[T[begin][0]] &&begin) begin++; 
		while ( !terms[T[end][0]] && end)    end--;
		out.push([ T[begin][2],T[end][2]+1,candidate[1]]);
	}
	return out;
}

const defaulttokenizer={
	tokenize:function(str){ 
	//naively break a string into tokens , without considering surrogate and non-chinese words
		return str.split("").map(function(s,idx){
			return [s,s,idx];  //normalized term, original term , index in str
		});
	}
}
const indexOf=function(text,query,opts){
	opts=opts||{};
	const tokenizer=opts.tokenizer||defaulttokenizer;//caller can supply a tokenizer
	const terms={};
	const T=tokenizer.tokenize(text);
	const Q=tokenizer.tokenize(query);
	const win_expand=opts.win_expand || WIN_EXPAND;

	Q.forEach(function(q){ terms[q[0]]= true }); //for fast checking if term exists in query
	
	const windowsize=Math.floor( Q.length*win_expand) +1 ; //window size for convolution
	const threshold=Math.floor(Q.length/2);      //a substring in window must earn more than 50%

	var candidates=convolute(T,terms,threshold,windowsize);
	const matches=candidatesToStringIndex(candidates,T,terms,windowsize);

	return matches;
}
module.exports={indexOf};