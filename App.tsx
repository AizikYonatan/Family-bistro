import React, { useState } from 'react';
import { CustomerView } from './components/CustomerView.tsx';
import { KitchenView } from './components/KitchenView.tsx';
import { TrackerView } from './components/TrackerView.tsx';
import { ChefHat, Utensils, Lock, KeyRound, Clock } from 'lucide-react';

type ViewMode = 'landing' | 'customer' | 'kitchen' | 'tracker';

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>('landing');
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');

  const handleChefClick = () => {
    setShowPasscodeModal(true);
    setPasscode('');
    setError('');
  };

  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === '5309') {
      setShowPasscodeModal(false);
      setView('kitchen');
    } else {
      setError('Incorrect chef code!');
      setPasscode('');
    }
  };

  if (view === 'customer') {
    return <CustomerView onBack={() => setView('landing')} />;
  }

  if (view === 'kitchen') {
    return <KitchenView onBack={() => setView('landing')} />;
  }

  if (view === 'tracker') {
    return <TrackerView onBack={() => setView('landing')} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-100 to-orange-50 flex items-center justify-center p-4 relative">
      
      {/* Corner Chef Button */}
      <button 
        onClick={handleChefClick}
        className="absolute top-4 right-4 bg-white/50 hover:bg-white p-3 rounded-full shadow-sm hover:shadow-md transition-all text-slate-400 hover:text-orange-600 z-10"
        title="Chef Access"
      >
        <ChefHat size={24} />
      </button>

      <div className={`max-w-2xl w-full text-center space-y-12 animate-fade-in-up transition-opacity duration-300 ${showPasscodeModal ? 'opacity-30 blur-sm pointer-events-none' : 'opacity-100'}`}>
        <div className="space-y-4">
          <div className="bg-white w-24 h-24 rounded-full shadow-xl flex items-center justify-center mx-auto mb-8 border-4 border-orange-200">
            <Utensils size={48} className="text-orange-500" />
          </div>
          <h1 className="text-5xl font-black text-gray-800 tracking-tight">Family Bistro</h1>
          <p className="text-xl text-gray-600 max-w-lg mx-auto">
            Welcome to the family fun zone! Order food or track your meal status.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-xl mx-auto">
          <button 
            onClick={() => setView('customer')}
            className="group relative bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-orange-400 text-left overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Utensils size={100} className="text-orange-500 transform rotate-12" />
            </div>
            <div className="relative z-10">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4 text-orange-600">
                <Utensils size={24} />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">I'm Hungry</h2>
              <p className="text-gray-500">View the menu and order delicious food.</p>
            </div>
          </button>

          <button 
            onClick={() => setView('tracker')}
            className="group relative bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-blue-400 text-left overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Clock size={100} className="text-blue-500 transform -rotate-12" />
            </div>
            <div className="relative z-10">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 text-blue-600">
                <Clock size={24} />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Track Order</h2>
              <p className="text-gray-500">Check if your food is cooking or ready to eat.</p>
            </div>
          </button>
        </div>

        <div className="text-sm text-gray-400 pt-8">
            <p>Powered by Google Gemini AI • Built with React & Tailwind</p>
        </div>
      </div>

      {/* Passcode Modal */}
      {showPasscodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full animate-bounce-in relative z-10">
            <div className="text-center mb-6">
              <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-700">
                <KeyRound size={32} />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Chef Access</h2>
              <p className="text-gray-500 text-sm mt-1">Enter the secret code to enter the kitchen.</p>
            </div>

            <form onSubmit={handlePasscodeSubmit} className="space-y-4">
              <div>
                <input
                  autoFocus
                  type="password"
                  inputMode="numeric"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter code"
                  className="w-full text-center text-3xl font-bold tracking-widest border-2 border-gray-200 rounded-xl p-4 focus:border-orange-500 focus:outline-none transition-colors"
                  maxLength={4}
                />
              </div>
              
              {error && (
                <div className="text-red-500 text-sm text-center font-medium animate-shake">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShowPasscodeModal(false)}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl shadow-lg transition-transform active:scale-95"
                >
                  Enter
                </button>
              </div>
            </form>
          </div>
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-0" onClick={() => setShowPasscodeModal(false)} />
        </div>
      )}
    </div>
  );
};

export default App;