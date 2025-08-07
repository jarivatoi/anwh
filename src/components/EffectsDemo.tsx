import React, { useState } from 'react';
import { User, Check, X, Zap, Sparkles } from 'lucide-react';

export const EffectsDemo: React.FC = () => {
  const [activeEffect, setActiveEffect] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);

  const triggerEffect = (effectName: string) => {
    setActiveEffect(effectName);
    
    // Reset after animation duration
    setTimeout(() => {
      setActiveEffect(null);
      if (effectName === 'success') {
        setShowSuccess(false);
      }
      if (effectName === 'shake') {
        setShowError(false);
      }
    }, effectName === 'colorWave' ? 3000 : effectName === 'typing' ? 2000 : 1000);
    
    if (effectName === 'success') {
      setShowSuccess(true);
    }
    if (effectName === 'shake') {
      setShowError(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Visual Effects Demo
          </h1>
          <p className="text-gray-600">
            Click any button to see the animation effect in action
          </p>
        </div>

        {/* Effects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* 1. Ripple Effect */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4 text-center">Ripple Effect</h3>
            <div className="flex justify-center mb-4">
              <div 
                className={`relative overflow-hidden bg-blue-500 text-white px-6 py-3 rounded-lg cursor-pointer ${
                  activeEffect === 'ripple' ? 'ripple-effect' : ''
                }`}
                onClick={() => triggerEffect('ripple')}
              >
                <User className="w-5 h-5 inline mr-2" />
                NARAYYA
                {activeEffect === 'ripple' && (
                  <div className="ripple-circle"></div>
                )}
              </div>
            </div>
            <button
              onClick={() => triggerEffect('ripple')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Trigger Ripple
            </button>
          </div>

          {/* 2. Shake Animation */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4 text-center">Shake Animation</h3>
            <div className="flex justify-center mb-4">
              <div 
                className={`bg-red-500 text-white px-6 py-3 rounded-lg ${
                  activeEffect === 'shake' ? 'shake-effect' : ''
                }`}
              >
                <X className="w-5 h-5 inline mr-2" />
                {showError ? 'Authentication Failed!' : 'BHEKUR'}
              </div>
            </div>
            <button
              onClick={() => triggerEffect('shake')}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Trigger Shake
            </button>
          </div>

          {/* 3. Success Checkmark */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4 text-center">Success Animation</h3>
            <div className="flex justify-center mb-4">
              <div className="relative bg-green-500 text-white px-6 py-3 rounded-lg">
                <User className="w-5 h-5 inline mr-2" />
                DOMUN
                {showSuccess && (
                  <div className="absolute -top-2 -right-2 success-checkmark">
                    <Check className="w-6 h-6 text-green-600 bg-white rounded-full p-1" />
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => triggerEffect('success')}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Trigger Success
            </button>
          </div>

          {/* 4. Typing Indicator */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4 text-center">Typing Indicator</h3>
            <div className="flex justify-center mb-4">
              <div className="bg-purple-500 text-white px-6 py-3 rounded-lg flex items-center">
                <User className="w-5 h-5 mr-2" />
                HOSENBUX
                {activeEffect === 'typing' && (
                  <div className="typing-dots ml-2">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => triggerEffect('typing')}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Trigger Typing
            </button>
          </div>

          {/* 5. Color Wave */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4 text-center">Color Wave</h3>
            <div className="flex justify-center mb-4">
              <div 
                className={`text-white px-6 py-3 rounded-lg ${
                  activeEffect === 'colorWave' ? 'color-wave-effect' : 'bg-indigo-500'
                }`}
              >
                <User className="w-5 h-5 inline mr-2" />
                JUMMUN
              </div>
            </div>
            <button
              onClick={() => triggerEffect('colorWave')}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Trigger Color Wave
            </button>
          </div>

          {/* 6. Bounce Effect */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4 text-center">Bounce Effect</h3>
            <div className="flex justify-center mb-4">
              <div 
                className={`bg-orange-500 text-white px-6 py-3 rounded-lg ${
                  activeEffect === 'bounce' ? 'bounce-effect' : ''
                }`}
              >
                <User className="w-5 h-5 inline mr-2" />
                PITTEA
              </div>
            </div>
            <button
              onClick={() => triggerEffect('bounce')}
              className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              Trigger Bounce
            </button>
          </div>

          {/* 7. Glow Pulse */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4 text-center">Glow Pulse</h3>
            <div className="flex justify-center mb-4">
              <div 
                className={`bg-pink-500 text-white px-6 py-3 rounded-lg ${
                  activeEffect === 'glow' ? 'glow-pulse-effect' : ''
                }`}
              >
                <Sparkles className="w-5 h-5 inline mr-2" />
                MAUDHOO
              </div>
            </div>
            <button
              onClick={() => triggerEffect('glow')}
              className="w-full px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
            >
              Trigger Glow
            </button>
          </div>

          {/* 8. Morphing Border */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4 text-center">Morphing Border</h3>
            <div className="flex justify-center mb-4">
              <div 
                className={`bg-teal-500 text-white px-6 py-3 ${
                  activeEffect === 'morph' ? 'morphing-border-effect' : 'rounded-lg'
                }`}
              >
                <Zap className="w-5 h-5 inline mr-2" />
                VEERASAWMY
              </div>
            </div>
            <button
              onClick={() => triggerEffect('morph')}
              className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
            >
              Trigger Morph
            </button>
          </div>

          {/* 9. Particle Effect */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4 text-center">Particle Effect</h3>
            <div className="flex justify-center mb-4">
              <div 
                className={`relative bg-yellow-500 text-white px-6 py-3 rounded-lg ${
                  activeEffect === 'particles' ? 'particle-effect' : ''
                }`}
              >
                <User className="w-5 h-5 inline mr-2" />
                GHOORAN
                {activeEffect === 'particles' && (
                  <>
                    <div className="particle particle-1"></div>
                    <div className="particle particle-2"></div>
                    <div className="particle particle-3"></div>
                    <div className="particle particle-4"></div>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={() => triggerEffect('particles')}
              className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
            >
              Trigger Particles
            </button>
          </div>
        </div>

        {/* Back to App Button */}
        <div className="text-center mt-8">
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
          >
            ← Back to App
          </button>
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        /* Ripple Effect */
        .ripple-effect {
          position: relative;
          overflow: hidden;
        }
        
        .ripple-circle {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 20px;
          height: 20px;
          background: rgba(255, 255, 255, 0.6);
          border-radius: 50%;
          transform: translate(-50%, -50%) scale(0);
          animation: ripple 0.6s ease-out;
        }
        
        @keyframes ripple {
          0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(4);
            opacity: 0;
          }
        }

        /* Shake Effect */
        .shake-effect {
          animation: shake 0.5s ease-in-out;
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-3px); }
          20%, 40%, 60%, 80% { transform: translateX(3px); }
        }

        /* Success Checkmark */
        .success-checkmark {
          animation: successPop 0.6s ease-out;
        }
        
        @keyframes successPop {
          0% { 
            transform: scale(0) rotate(0deg); 
            opacity: 0; 
          }
          50% { 
            transform: scale(1.3) rotate(180deg); 
            opacity: 1; 
          }
          100% { 
            transform: scale(1) rotate(360deg); 
            opacity: 1; 
          }
        }

        /* Typing Indicator */
        .typing-dots span {
          display: inline-block;
          width: 4px;
          height: 4px;
          background: white;
          border-radius: 50%;
          margin: 0 1px;
          animation: typing 1.4s infinite;
        }
        
        .typing-dots span:nth-child(2) {
          animation-delay: 0.2s;
        }
        
        .typing-dots span:nth-child(3) {
          animation-delay: 0.4s;
        }
        
        @keyframes typing {
          0%, 60%, 100% { 
            opacity: 0.3;
            transform: translateY(0);
          }
          30% { 
            opacity: 1;
            transform: translateY(-4px);
          }
        }

        /* Color Wave */
        .color-wave-effect {
          animation: colorWave 3s ease-in-out infinite;
        }
        
        @keyframes colorWave {
          0% { background: linear-gradient(45deg, #6366f1, #8b5cf6); }
          25% { background: linear-gradient(45deg, #8b5cf6, #ec4899); }
          50% { background: linear-gradient(45deg, #ec4899, #f59e0b); }
          75% { background: linear-gradient(45deg, #f59e0b, #10b981); }
          100% { background: linear-gradient(45deg, #10b981, #6366f1); }
        }

        /* Bounce Effect */
        .bounce-effect {
          animation: bounce 0.8s ease-in-out;
        }
        
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0) scale(1);
          }
          40% {
            transform: translateY(-8px) scale(1.05);
          }
          60% {
            transform: translateY(-4px) scale(1.02);
          }
        }

        /* Glow Pulse */
        .glow-pulse-effect {
          animation: glowPulse 1s ease-in-out infinite;
        }
        
        @keyframes glowPulse {
          0%, 100% {
            box-shadow: 0 0 20px rgba(236, 72, 153, 0.6);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 40px rgba(236, 72, 153, 0.9);
            transform: scale(1.05);
          }
        }

        /* Morphing Border */
        .morphing-border-effect {
          animation: morphBorder 1s ease-in-out infinite;
        }
        
        @keyframes morphBorder {
          0% { border-radius: 8px; }
          25% { border-radius: 50px 8px 8px 8px; }
          50% { border-radius: 50px 50px 8px 8px; }
          75% { border-radius: 50px 50px 50px 8px; }
          100% { border-radius: 8px; }
        }

        /* Particle Effect */
        .particle-effect {
          position: relative;
        }
        
        .particle {
          position: absolute;
          width: 6px;
          height: 6px;
          background: #fbbf24;
          border-radius: 50%;
          pointer-events: none;
        }
        
        .particle-1 {
          top: -10px;
          left: -10px;
          animation: particle1 1s ease-out;
        }
        
        .particle-2 {
          top: -10px;
          right: -10px;
          animation: particle2 1s ease-out;
        }
        
        .particle-3 {
          bottom: -10px;
          left: -10px;
          animation: particle3 1s ease-out;
        }
        
        .particle-4 {
          bottom: -10px;
          right: -10px;
          animation: particle4 1s ease-out;
        }
        
        @keyframes particle1 {
          0% { transform: translate(0, 0) scale(0); opacity: 1; }
          100% { transform: translate(-20px, -20px) scale(1); opacity: 0; }
        }
        
        @keyframes particle2 {
          0% { transform: translate(0, 0) scale(0); opacity: 1; }
          100% { transform: translate(20px, -20px) scale(1); opacity: 0; }
        }
        
        @keyframes particle3 {
          0% { transform: translate(0, 0) scale(0); opacity: 1; }
          100% { transform: translate(-20px, 20px) scale(1); opacity: 0; }
        }
        
        @keyframes particle4 {
          0% { transform: translate(0, 0) scale(0); opacity: 1; }
          100% { transform: translate(20px, 20px) scale(1); opacity: 0; }
        }
      `}</style>
    </div>
  );
};