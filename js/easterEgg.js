let clickCount = 0;

function handleEasterEgg() {
  clickCount++;
  if (clickCount === 3) {
    const carImage = document.createElement("img");
    carImage.src = "/car.png";
    carImage.style.position = "absolute";
    carImage.style.top = "50%";
    carImage.style.transform = "translate(-100%, -50%)";
    document.body.appendChild(carImage);

    // Animate the car across the screen
    const animationDuration = 3000;
    const carWidth = 100; 
    const startPosition = -carWidth;
    const endPosition = document.documentElement.scrollWidth;
    const distance = endPosition - startPosition;
    const startTime = Date.now();

    function animateCar() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);
      const currentPosition = startPosition + distance * progress;

      carImage.style.left = currentPosition + "px";

      if (currentPosition < document.documentElement.scrollWidth) {
        // Car is still within the visible area, continue animating
        requestAnimationFrame(animateCar);
      } else {
        // Car has reached or passed the end of the page, remove it
        carImage.remove();
        clickCount = 0;
      }
    }

    animateCar();
  }
}
