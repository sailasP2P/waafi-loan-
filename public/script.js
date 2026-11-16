
document.addEventListener("DOMContentLoaded", function () {
  const amountSlider = document.getElementById("amount");
  const monthsSlider = document.getElementById("months");

  const amountDisplay = document.getElementById("amountValue");
  const monthsDisplay = document.getElementById("monthsValue");
  const monthlyDisplay = document.getElementById("monthlyPayment");

  if (!amountSlider || !monthsSlider) {
    return;
  }

  function calculateLoan() {
    const amount = Number(amountSlider.value);
    const months = Number(monthsSlider.value);

    // Illustrative estimate only, not a loan offer or approved rate.
    const illustrativeTotal = amount * 1.18;
    const monthlyPayment = illustrativeTotal / months;

    if (amountDisplay) {
      amountDisplay.textContent = "$" + amount.toFixed(2);
    }

    if (monthsDisplay) {
      monthsDisplay.textContent = months + " months";
    }

    if (monthlyDisplay) {
      monthlyDisplay.textContent = "$" + monthlyPayment.toFixed(2);
    }
  }

  amountSlider.addEventListener("input", calculateLoan);
  monthsSlider.addEventListener("input", calculateLoan);

  calculateLoan();
});
