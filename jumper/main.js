var game=new Game();
game.init();


game.addSuccessFn(success);
game.addFailedFn(failed);

var mask=document.querySelector(".mask");
var reButton=document.querySelector(".restart");
var score=document.querySelector(".score_show");


reButton.addEventListener("click",restart);

function restart(){
    mask.style.display="none";
    location.href='http://localhost:63342/jumper/index.html';
  //  game.restart();
}

function failed(){
   score.innerText=game.score;
   mask.style.display="flex";
}

function success(score){
    var scoreCurrent=document.querySelector(".score");
    scoreCurrent.innerText=score;
}
