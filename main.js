// LIFF Frontend - เฉพาะการแสดงผล
// GraphQL endpoint
const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL;

// Configuration
const CONFIG = {
  FETCH_TIMEOUT: parseInt(import.meta.env.VITE_FETCH_TIMEOUT) || 3000,
  LIFF_ID: import.meta.env.VITE_LIFF_ID
};

// Global variables
const app = document.querySelector('#app');
let currentUserId = null;
let isLoading = false;
let liffInitialized = false;

// LIFF session management
async function checkLiffSession() {
  try {
    if (typeof liff === 'undefined') {
      console.warn('LIFF SDK not loaded');
      return false;
    }

    if (!liffInitialized) {
      await liff.init({ liffId: CONFIG.LIFF_ID });
      liffInitialized = true;
    }

    if (!liff.isLoggedIn()) {
      console.warn('LIFF not logged in');
      // Auto login in LIFF environment
      if (liff.isInClient()) {
        liff.login({ redirectUri: window.location.href });
      } else {
        liff.login();
      }
      return false;
    }

    // Check if token is still valid by getting access token
    const accessToken = liff.getAccessToken();
    if (!accessToken) {
      console.warn('No valid access token');
      return false;
    }

    console.log('LIFF session is valid');
    return true;
  } catch (error) {
    console.error('LIFF session check failed:', error);
    return false;
  }
}

async function refreshLiffSession() {
  try {
    if (typeof liff !== 'undefined') {
      // Force re-login to refresh token
      if (liff.isLoggedIn()) {
        liff.logout();
      }
      liff.login();
    } else {
      // Fallback: reload the page
      window.location.reload();
    }
  } catch (error) {
    console.error('Failed to refresh LIFF session:', error);
    window.location.reload();
  }
}

// Utility functions
async function fetchWithTimeout(url, options, timeout = CONFIG.FETCH_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

async function graphQLRequest(query, variables = {}) {
  // Get LIFF access token
  let accessToken = null;
  try {
    if (typeof liff !== 'undefined' && liff.isLoggedIn()) {
      accessToken = liff.getAccessToken();
    }
  } catch (error) {
    console.warn('Failed to get LIFF access token:', error);
  }

  const headers = { 'Content-Type': 'application/json' };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetchWithTimeout(GRAPHQL_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables })
  });

  if (!response.ok) {
    // Check if it's an authentication error
    if (response.status === 401 || response.status === 403) {
      throw new Error('Session expired. Please refresh the page and try again.');
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.errors) {
    const errorMessage = data.errors[0]?.message || 'Unknown error';
    // Check for token expiration errors
    if (errorMessage.includes('token') || errorMessage.includes('auth')) {
      throw new Error('Session expired. Please refresh the page and try again.');
    }
    throw new Error(`GraphQL error: ${errorMessage}`);
  }
  
  return data;
}

// Data fetching functions
async function fetchUserLatestMessage(userId) {
  if (isLoading) return null;
  isLoading = true;
  
  try {
    const query = `
      query GetUserLatestMessage($userId: String!) {
        messages(userId: $userId, limit: 1, orderBy: "timestamp", order: "DESC") {
          id
          text
          userId
          timestamp
        }
      }
    `;

    const data = await graphQLRequest(query, { userId });
    const messages = data.data.messages;
    return messages && messages.length > 0 ? messages[0] : null;
  } finally {
    isLoading = false;
  }
}

// Display functions based on current path
function displayListView() {
  app.innerHTML = `
    <div style="
      padding: 20px; 
      max-width: 600px; 
      width: 100%;
      height: 100vh;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      justify-content: center;
      box-sizing: border-box;
      text-align: center;
      font-family: Arial, sans-serif;
    ">
      <h1 style="color: #333; margin: 0;">Hello World</h1>
      <p style="color: #666; margin-top: 10px;">📋 List View</p>
    </div>
  `;
}

function displayOCREditor(ocrText, userId) {
  console.log('=== displayOCREditor START ===');
  console.log('displayOCREditor called with:', { ocrText, userId });
  console.log('OCR Text length:', ocrText ? ocrText.length : 0);
  console.log('Will display text in textarea:', ocrText);
  
  app.innerHTML = `
    <div style="
      padding: 20px; 
      max-width: 600px; 
      width: 100%;
      height: 100vh;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      justify-content: center;
      box-sizing: border-box;
      overflow: hidden;
    ">
      <textarea 
        id="ocrTextarea" 
        style="
          width: 100%;
          height: 60vh;
          max-height: 400px;
          padding: 15px;
          border: 2px solid #ddd;
          border-radius: 8px;
          font-size: 16px;
          font-family: Arial, sans-serif;
          resize: none;
          box-sizing: border-box;
          overflow-y: auto;
        "
        placeholder="ข้อความจาก OCR..."
      >${ocrText || ''}</textarea>
      
      <button 
        id="saveButton"
        onclick="saveOCRMessage()"
        style="
          width: 100%;
          padding: 15px;
          margin-top: 15px;
          background: #000000;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
          font-family: Arial, sans-serif;
          font-weight: bold;
        "
        onmouseover="this.style.background='#333333'"
        onmouseout="this.style.background='#000000'"
      >บันทึกข้อความ</button>
    </div>
  `;
  
  // Auto-focus และ select text
  setTimeout(() => {
    const textarea = document.getElementById('ocrTextarea');
    if (textarea) {
      console.log('=== TEXTAREA FOUND ===');
      console.log('Textarea value:', textarea.value);
      textarea.focus();
      textarea.select();
      console.log('=== OCR EDITOR SETUP COMPLETE ===');
    } else {
      console.error('=== TEXTAREA NOT FOUND ===');
    }
  }, 100);
  
  console.log('=== displayOCREditor END ===');
}

function getCurrentView() {
  const path = window.location.pathname;
  return path === '/list' ? 'list' : 'edit';
}

// Get URL parameters
function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    message: params.get('message') || '',
    userId: params.get('userId') || '',
    messageId: params.get('messageId') || '',
    action: params.get('action') || '',
    text: params.get('text') || ''
  };
}

// UI rendering
function displayMessageEditor(message) {
  // ใช้ข้อความจาก URL parameters หรือข้อความจาก database
  const urlParams = getUrlParams();
  const messageText = urlParams.message || (message ? message.text : '');
  
  console.log('URL Parameters:', urlParams);
  console.log('Using message text:', messageText);
  
  app.innerHTML = `
    <div style="
      padding: 20px; 
      max-width: 600px; 
      width: 100%;
      height: 100vh;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      justify-content: center;
      box-sizing: border-box;
      overflow: hidden;
    ">
      <textarea 
        id="messageTextarea" 
        style="
          width: 100%;
          min-height: 200px;
          max-height: 400px;
          padding: 15px;
          border: 2px solid #ddd;
          border-radius: 8px;
          font-size: 16px;
          font-family: Arial, sans-serif;
          resize: none;
          box-sizing: border-box;
          overflow-y: auto;
        "
        placeholder="ข้อความของคุณ..."
      >${messageText}</textarea>
      
      <button 
        id="saveButton"
        onclick="saveMessage()"
        style="
          width: 100%;
          padding: 15px;
          margin-top: 15px;
          background: #000000;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: background-color 0.3s;
        "
      >
        บันทึกข้อความ
      </button>
    </div>
  `;
}

// Message saving function
async function saveMessage() {
  const textarea = document.getElementById('messageTextarea');
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
    // Check LIFF session before making request
    const sessionValid = await checkLiffSession();
    if (!sessionValid) {
      throw new Error('Session expired. Please refresh the page and try again.');
    }

    if (!currentUserId) {
      throw new Error('Please login through LINE to continue.');
    }

    const userId = currentUserId;
    const urlParams = new URLSearchParams(window.location.search);
    const messageId = urlParams.get('messageId');
    
    // ใช้ editMessage เพื่อให้ได้ Flex Message สีส้ม
    if (messageId) {
      const mutation = `
        mutation EditMessage($messageId: String!, $newText: String!, $userId: String!) {
          editMessage(messageId: $messageId, newText: $newText, userId: $userId) {
            id
            text
            userId
            timestamp
          }
        }
      `;
      
      const data = await graphQLRequest(mutation, {
        messageId: messageId,
        newText: messageText,
        userId: userId
      });
      
      if (data.data.editMessage) {
        saveButton.textContent = 'แก้ไขเรียบร้อย!';
        
        // Close LIFF window
        setTimeout(() => {
          if (typeof liff !== 'undefined') {
            liff.closeWindow();
          } else {
            window.close();
          }
        }, 1000);
        
      } else {
        throw new Error('แก้ไขข้อความไม่สำเร็จ');
      }
      
    } else {
      // กรณีไม่มี messageId ให้ส่งข้อความใหม่ด้วย Flex Message หัว EDIT สีส้ม
      const mutation = `
        mutation EditTextMessage($text: String!, $userId: String!) {
          editTextMessage(input: { to: $userId, text: $text }) {
            success
            message
          }
        }
      `;
      
      const data = await graphQLRequest(mutation, {
        text: messageText,
        userId: userId
      });
      
      if (data.data.editTextMessage.success) {
        saveButton.textContent = 'บันทึกเรียบร้อย!';
        
        // Close LIFF window
        setTimeout(() => {
          if (typeof liff !== 'undefined') {
            liff.closeWindow();
          } else {
            window.close();
          }
        }, 1000);
        
      } else {
        throw new Error(data.data.editTextMessage.message || 'บันทึกไม่สำเร็จ');
      }
    }
    
  } catch (error) {
    console.error('Error saving message:', error);
    
    // Check if it's a session expiration error
    if (error.message.includes('Session expired') || error.message.includes('token') || error.message.includes('auth')) {
      saveButton.textContent = 'หมดเวลา - กำลังรีเฟรช...';
      saveButton.style.background = '#F39C12';
      
      // Show refresh option to user
      setTimeout(() => {
        if (confirm('เซสชันหมดอายุแล้ว คุณต้องการรีเฟรชหน้าเพื่อเข้าสู่ระบบใหม่หรือไม่?')) {
          refreshLiffSession();
        } else {
          saveButton.textContent = 'บันทึกข้อความ';
          saveButton.style.background = '#000000';
          saveButton.disabled = false;
        }
      }, 1000);
    } else {
      saveButton.textContent = 'บันทึกไม่สำเร็จ - ลองอีกครั้ง';
      saveButton.style.background = '#E74C3C';
      saveButton.disabled = false;
      
      setTimeout(() => {
        saveButton.textContent = 'บันทึกข้อความ';
        saveButton.style.background = '#000000';
      }, 3000);
    }
  }
}

// Make function global for onclick
window.saveMessage = saveMessage;

// Error display
function displayError(error) {
  const isLoginError = error.message.includes('login') || error.message.includes('Login');
  
  app.innerHTML = `
    <div style="
      padding: 20px; 
      max-width: 400px; 
      width: 100%;
      height: 100vh;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      justify-content: center;
      text-align: center;
      box-sizing: border-box;
    ">
      <div style="
        padding: 30px;
        background: ${isLoginError ? '#fff3cd' : '#f8d7da'};
        border: 1px solid ${isLoginError ? '#ffeaa7' : '#f5c6cb'};
        border-radius: 8px;
        color: ${isLoginError ? '#856404' : '#721c24'};
      ">
        <h3 style="margin: 0 0 15px 0; font-size: 18px;">
          ${isLoginError ? '🔐 ต้องเข้าสู่ระบบ' : '❌ เกิดข้อผิดพลาด'}
        </h3>
        <p style="margin: 0; font-size: 14px; line-height: 1.5;">
          ${error.message || 'ไม่สามารถโหลดข้อความได้'}
        </p>
        ${isLoginError ? `
          <button 
            onclick="window.location.reload()" 
            style="
              margin-top: 20px;
              padding: 10px 20px;
              background: #007bff;
              color: white;
              border: none;
              border-radius: 5px;
              cursor: pointer;
              font-size: 14px;
            "
          >
            รีเฟรชหน้า
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

// LIFF initialization and main app logic
const currentView = getCurrentView();

if (currentView === 'list') {
  displayListView();
} else {
  // เช็คว่ามีข้อความจาก URL parameters หรือไม่
  const urlParams = getUrlParams();
  
  if (urlParams.message) {
    // ถ้ามีข้อความจาก URL แสดงทันที
    console.log('Loading message from URL parameters');
    displayMessageEditor({ text: urlParams.message });
  } else {
    // เรียก LIFF init เรียบง่าย เหมือนเดิม
    initLiffAndDisplay();
  }
}

// ฟังก์ชันเดียวสำหรับ init LIFF และแสดงผล
async function initLiffAndDisplay() {
  try {
    console.log('Starting LIFF initialization...');
    
    // ตรวจสอบว่า LIFF พร้อมแล้วหรือยัง
    if (typeof liff === 'undefined') {
      console.error('LIFF SDK not loaded');
      displayMessageEditor(null);
      return;
    }
    
    // init LIFF ครั้งเดียว
    await liff.init({ liffId: CONFIG.LIFF_ID });
    console.log('LIFF initialized successfully');
    console.log('LIFF Environment:', {
      isInClient: liff.isInClient(),
      isLoggedIn: liff.isLoggedIn(),
      os: liff.getOS(),
      version: liff.getVersion(),
      language: liff.getLanguage(),
      liffId: CONFIG.LIFF_ID
    });
    
    // ตรวจสอบว่า login แล้วหรือยัง
    if (!liff.isLoggedIn()) {
      console.log('User not logged in, redirecting to login...');
      // ใน LIFF environment ให้ login แบบ redirect
      if (liff.isInClient()) {
        liff.login({ redirectUri: window.location.href });
      } else {
        liff.login();
      }
      return;
    }
    
    // ได้ profile
    const profile = await liff.getProfile();
    currentUserId = profile.userId;
    console.log('Profile loaded:', currentUserId);
    
    if (!currentUserId) {
      throw new Error('Failed to get user profile. Please try again.');
    }
    
    // เช็ค URL parameters สำหรับ OCR editing
    const urlParams = getUrlParams();
    console.log('=== DEBUG OCR ===');
    console.log('Current URL:', window.location.href);
    console.log('URL Parameters:', urlParams);
    console.log('Action:', urlParams.action);
    console.log('Text:', urlParams.text);
    console.log('User ID:', urlParams.userId);
    
    if (urlParams.action === 'edit' && urlParams.text) {
      console.log('=== ENTERING OCR EDIT MODE ===');
      // โหมด OCR editing
      const decodedText = decodeURIComponent(urlParams.text);
      console.log('Decoded text:', decodedText);
      displayOCREditor(decodedText, urlParams.userId);
      return;
    }
    
    // โหลดข้อความล่าสุด (ถ้ามี)
    let message = null;
    try {
      message = await fetchUserLatestMessage(currentUserId);
      console.log('Message loaded:', message);
    } catch (error) {
      console.log('No previous message found');
    }
    
    // แสดงผลครั้งเดียว
    displayMessageEditor(message);
    
  } catch (error) {
    console.error('LIFF initialization error:', error);
    displayError(error);
  }
}
