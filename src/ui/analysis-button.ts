export function createAnaliseButton(): void {
  const analiseButton = document.createElement("button");
  analiseButton.textContent = "Análise";
  analiseButton.style.position = "absolute";
  analiseButton.style.top = "50px"; 
  analiseButton.style.right = "10px"; 
  analiseButton.style.padding = "5px 10px";
  analiseButton.style.zIndex = "10";
  
  analiseButton.addEventListener("click", () => {

      window.open("analise.html", "_blank"); 
  });
  
  document.body.appendChild(analiseButton);
}