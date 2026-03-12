#!/usr/bin/env python3
"""
Test Groq API connectivity
Run: python backend/scripts/test_groq.py
"""

import os
import sys
from dotenv import load_dotenv
from groq import Groq

def test_groq():
    load_dotenv()
    
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        print("❌ GROQ_API_KEY not found in .env")
        return False
    
    print("🔑 Testing Groq API connection...")
    print(f"   API Key: {api_key[:10]}...{api_key[-10:]}")
    
    try:
        client = Groq(api_key=api_key)
        
        # Test with a simple model
        print("📞 Making test request...")
        resp = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "user", "content": "Respond with just the word SUCCESS"}
            ],
            max_tokens=10,
            temperature=0.1
        )
        
        result = resp.choices[0].message.content.strip()
        print(f"✅ Groq API Response: {result}")
        
        if "SUCCESS" in result:
            print("🎉 Groq API is working correctly!")
            return True
        else:
            print("⚠️  Unexpected response, but connection works")
            return True
            
    except Exception as e:
        print(f"❌ Groq API Error: {e}")
        print("💡 Possible solutions:")
        print("   1. Check if API key is valid")
        print("   2. Verify network connectivity")
        print("   3. Check Groq service status")
        return False

if __name__ == "__main__":
    success = test_groq()
    sys.exit(0 if success else 1)
