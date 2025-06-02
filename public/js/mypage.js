// public/js/mypage.js
document.getElementById('showEmployeeFormBtn').addEventListener('click', () => {
    document.getElementById('employeeRegistrationForm').style.display = 'block';
  });
  
  document.getElementById('employeeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const employeeData = Object.fromEntries(formData.entries());
  
    try {
      const response = await fetch('/api/employees/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(employeeData),
      });
  
      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        e.target.reset();
        document.getElementById('employeeRegistrationForm').style.display = 'none';
      } else {
        const error = await response.json();
        alert(error.error);
      }
    } catch (error) {
      console.error('従業員登録エラー:', error);
      alert('従業員の登録に失敗しました');
    }
  });