/**
 * Client-side Groq AI service for demo purposes
 * Uses environment variables for API key and models
 */

interface GroqMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface GroqResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

interface ThreatAssessment {
  threat_level: 'low' | 'medium' | 'high' | 'critical'
  summary: string
  detail: string
  tags: string[]
  confidence_in_assessment: number
}

interface QueryResponse {
  answer: string
  aircraft_icaos: string[]
}

interface SensorDiagnosis {
  diagnosis: string
  severity: 'info' | 'warning' | 'critical'
  recommended_action: string
}

class GroqClient {
  private apiKey: string
  private baseUrl = 'https://api.groq.com/openai/v1'
  private fastModel: string
  private qualityModel: string

  constructor() {
    // Try multiple environment variable sources for Vercel compatibility
    this.apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY || 
                  process.env.GROQ_API_KEY || 
                  '' // API key should be set in Vercel environment variables
    this.fastModel = process.env.NEXT_PUBLIC_GROQ_MODEL_FAST || 'llama-3.1-70b-versatile' // Use faster model
    this.qualityModel = process.env.NEXT_PUBLIC_GROQ_MODEL_QUALITY || 'llama-3.1-8b-instant'
    
    if (!this.apiKey) {
      console.warn('🚨 NO GROQ API KEY FOUND - Using deterministic fallbacks')
      console.warn('🔧 Set NEXT_PUBLIC_GROQ_API_KEY in Vercel dashboard')
    } else {
      console.log('✅ Groq API key found - AI responses enabled')
    }
  }

  private async makeRequest(messages: GroqMessage[], model: string): Promise<string> {
    if (!this.apiKey) {
      // Fallback deterministic response for demo
      return JSON.stringify({
        threat_level: 'medium',
        summary: 'AI analysis temporarily unavailable in demo mode',
        detail: 'This is a fallback response for demo purposes',
        tags: ['demo-mode'],
        confidence_in_assessment: 0.5
      })
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.2,
          max_tokens: 500,
          response_format: { type: 'json_object' }
        })
      })

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status} ${response.statusText}`)
      }

      const data: GroqResponse = await response.json()
      return data.choices[0]?.message?.content || '{}'
    } catch (error) {
      console.error('Groq API error:', error)
      // Fallback response
      return JSON.stringify({
        threat_level: 'unknown',
        summary: 'AI analysis temporarily unavailable',
        detail: 'Please check API configuration',
        tags: ['error'],
        confidence_in_assessment: 0.0
      })
    }
  }

  async analyzeThreat(icao: string, hasAdsb: boolean, sensorCount: number, track: any[]): Promise<ThreatAssessment> {
    const trackSummary = track.slice(-8).map(pt => 
      ` - ${pt.timestamp_iso}: lat=${pt.lat.toFixed(4)} lon=${pt.lon.toFixed(4)} alt=${pt.alt_ft || 'N/A'}ft conf=${(pt.confidence * 100).toFixed(0)}%`
    ).join('\n')

    const messages: GroqMessage[] = [
      {
        role: 'system',
        content: 'You are an aviation intelligence analyst. Analyze aircraft tracks and return ONLY valid JSON.'
      },
      {
        role: 'user',
        content: `Analyze this aircraft track and return ONLY valid JSON.
Aircraft: ${icao}
ADS-B transponder: ${hasAdsb ? 'ON' : 'OFF'}
Sensors detecting it: ${sensorCount}
Sector: Unknown
Recent track (newest last):
${trackSummary}

Return this exact JSON structure (no markdown, no explanation):
{
"threat_level": "low|medium|high|critical",
"summary": "One sentence shown in aircraft popup",
"detail": "2-3 sentences with specifics about what is unusual",
"tags": ["list", "of", "relevant", "tags"],
"confidence_in_assessment": 0.0
}`
      }
    ]

    const response = await this.makeRequest(messages, this.fastModel)
    return JSON.parse(response) as ThreatAssessment
  }

  async queryFlights(question: string, contextAircraftCount: number): Promise<QueryResponse> {
    const messages: GroqMessage[] = [
      {
        role: 'system',
        content: 'You are an aviation data analyst. Answer questions about tracked aircraft using ONLY valid JSON.'
      },
      {
        role: 'user',
        content: `Answer this question about tracked aircraft: "${question}"
Context: Currently tracking ${contextAircraftCount} aircraft.

Return this exact JSON structure (no markdown, no explanation):
{
"answer": "Your answer in plain English",
"aircraft_icaos": ["list", "of", "mentioned", "icao", "codes", "or", "empty", "array"]
}`
      }
    ]

    const response = await this.makeRequest(messages, this.fastModel)
    return JSON.parse(response) as QueryResponse
  }

  async diagnoseSensor(sensorId: string, recentErrors: string[], timingDriftNs?: number, messageRate?: number, expectedRate?: number): Promise<SensorDiagnosis> {
    const driftInfo = timingDriftNs ? `GPS timing drift: ${timingDriftNs.toFixed(0)}ns (threshold: 200ns)` : ''
    const rateInfo = messageRate && expectedRate ? `Message rate: ${messageRate.toFixed(1)}/s (expected: ${expectedRate.toFixed(1)}/s)` : ''
    const errorInfo = recentErrors.length > 0 ? `Recent error log lines:\n${recentErrors.join('\n')}` : ''

    const messages: GroqMessage[] = [
      {
        role: 'system',
        content: 'You are a sensor diagnostics expert. Analyze sensor issues and return ONLY valid JSON.'
      },
      {
        role: 'user',
        content: `Diagnose this Neuron Mode-S sensor issue.
Sensor ID: ${sensorId}
${driftInfo}
${rateInfo}
${errorInfo}

Return this exact JSON structure (no markdown, no explanation):
{
"diagnosis": "Plain English explanation of the issue",
"severity": "info|warning|critical",
"recommended_action": "Specific action to fix the issue"
}`
      }
    ]

    const response = await this.makeRequest(messages, this.qualityModel)
    return JSON.parse(response) as SensorDiagnosis
  }
}

export const groqClient = new GroqClient()
export type { ThreatAssessment, QueryResponse, SensorDiagnosis }
