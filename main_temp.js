// OCR Message saving function
async function saveOCRMessage() {
  const textarea = document.getElementById('ocrTextarea');
  const saveButton = document.getElementById('saveButton');
  
  if (!textarea) return;
  
  const messageText = textarea.value.trim();
  if (!messageText) {
    alert('กรุณาใส่ข้อความ');
    return;
  }
  
  saveButton.textContent = 'กำลังบันทึก...';
  saveButton.disabled = true;
  
  try {
    // ถ้าไม่มี currentUserId ให้ดึงจาก LIFF profile
    let userId = currentUserId;
    if (!userId) {
      try {
        if (typeof liff !== 'undefined' && liff.isLoggedIn()) {
          const profile = await liff.getProfile();
          userId = profile.userId;
          currentUserId = userId; // เก็บไว้ใช้ครั้งต่อไป
          console.log('Retrieved user ID from LIFF profile:', userId);
        }
      } catch (error) {
        console.error('Failed to get LIFF profile:', error);
      }
    }
    
    if (!userId) {
      throw new Error('Please login through LINE to continue.');
    }
    
    const mutation = `
      mutation SaveMessage($text: String!, $userId: String!) {
        sendTextMessage(input: { to: $userId, text: $text }) {
          success
          message
        }
      }
    `;
    
    const data = await graphQLRequest(mutation, {
      text: messageText,
      userId: userId
    });
    
    if (data.data.sendTextMessage.success) {
      saveButton.textContent = 'บันทึกเรียบร้อย!';
      
      // Store message in backend
      try {
        const addMessageMutation = `
          mutation AddMessage($text: String!, $userId: String!) {
            addMessage(text: $text, userId: $userId) {
              success
              message
            }
          }
        `;
        
        await graphQLRequest(addMessageMutation, {
          text: messageText,
          userId: userId
        });
      } catch (error) {
        console.log('Failed to store message in backend:', error);
      }
      
      setTimeout(() => {
        saveButton.textContent = 'บันทึกข้อความ';
        saveButton.disabled = false;
      }, 2000);
      
    } else {
      throw new Error(data.data.sendTextMessage.message || 'บันทึกไม่สำเร็จ');
    }
    
  } catch (error) {
    console.error('Save error:', error);
    saveButton.textContent = 'เกิดข้อผิดพลาด';
    setTimeout(() => {
      saveButton.textContent = 'บันทึกข้อความ';
      saveButton.disabled = false;
    }, 2000);
  }
}
