"use client";

import { useState, useEffect } from 'react';
import { Aptos, Network, AptosConfig } from '@aptos-labs/ts-sdk';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Award, Wallet } from 'lucide-react';
import dynamic from 'next/dynamic';

const SkillTokenApp = dynamic(() => Promise.resolve(SkillTokenComponent), {
  ssr: false
});

const config = new AptosConfig({ network: Network.DEVNET });
const aptos = new Aptos(config);

interface SkillToken {
  tokenId: string;
  skillName: string;
  skillLevel: number;
  owner: string;
  endorsements: number;
  createdAt: string;
}

declare global {
  interface Window {
    petra?: any;
  }
}

const debugLogResponse = (response: any) => {
  console.log('Response type:', typeof response);
  console.log('Is array:', Array.isArray(response));
  console.log('Raw response:', response);
  if (Array.isArray(response)) {
    console.log('Array length:', response.length);
    if (response.length > 0) {
      console.log('First item:', response[0]);
    }
  }
};

const transformMoveToken = (moveToken: any): SkillToken | null => {
  try {
    if (!moveToken || typeof moveToken !== 'object') {
      console.warn('Invalid token data received:', moveToken);
      return null;
    }

    const token: SkillToken = {
      tokenId: typeof moveToken.token_id !== 'undefined' ? String(moveToken.token_id) : '',
      skillName: typeof moveToken.skill_name !== 'undefined' ? String(moveToken.skill_name) : '',
      skillLevel: typeof moveToken.skill_level !== 'undefined' ? Number(moveToken.skill_level) : 0,
      owner: typeof moveToken.owner !== 'undefined' ? String(moveToken.owner) : '',
      endorsements: typeof moveToken.endorsements !== 'undefined' ? Number(moveToken.endorsements) : 0,
      createdAt: typeof moveToken.created_at !== 'undefined' ? String(moveToken.created_at) : String(Date.now())
    };

    if (!token.tokenId) {
      console.warn('Missing required token ID:', moveToken);
      return null;
    }

    return token;
  } catch (error) {
    console.error('Error transforming token:', error, moveToken);
    return null;
  }
};

function SkillTokenComponent() {
  const [skillTokens, setSkillTokens] = useState<SkillToken[]>([]);
  const [newSkill, setNewSkill] = useState({ skillName: '', skillLevel: 1 });
  const [walletAddress, setWalletAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWalletAvailable, setIsWalletAvailable] = useState<boolean | null>(null);
  const [isCheckingWallet, setIsCheckingWallet] = useState(true);

  const loadUserSkillTokens = async (address: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const moduleAddress = process.env.NEXT_PUBLIC_MODULE_ADDRESS;
      if (!moduleAddress) {
        throw new Error('Module address not configured');
      }

      // Ensure we're using the correct address format
      const normalizedAddress = address.startsWith('0x') ? address : `0x${address}`;

      const response = await aptos.view({
        function: `${moduleAddress}::skill_token::get_user_tokens`,
        typeArguments: [],
        arguments: [normalizedAddress]
      });

      debugLogResponse(response);

      if (!response) {
        console.warn('Received null or undefined response from view function');
        setSkillTokens([]);
        return;
      }

      if (!Array.isArray(response)) {
        console.error('Unexpected response format:', response);
        setError('Received invalid data format from contract');
        setSkillTokens([]);
        return;
      }

      const transformedTokens = response
        .filter(token => token !== null && token !== undefined)
        .map(token => transformMoveToken(token))
        .filter((token): token is SkillToken => token !== null);

      console.log('Transformed tokens:', transformedTokens);
      setSkillTokens(transformedTokens);

    } catch (err) {
      console.log('Error loading tokens:', err);
      setError(err instanceof Error ? err.message : 'Failed to load skill tokens');
      setSkillTokens([]);
    } finally {
      setIsLoading(false);
    }
  };

  const connectWallet = async () => {
    try {
      setError(null);
      if (typeof window === 'undefined' || !window.petra) {
        setError('Please install Petra wallet extension');
        return;
      }

      const response = await window.petra.connect();
      console.log('Wallet connection response:', response);

      // Get the current account to ensure we have the correct address
      const account = await window.petra.account();
      if (!account?.address) {
        throw new Error('Could not get wallet address');
      }

      // Normalize the address format
      const normalizedAddress = account.address.startsWith('0x')
        ? account.address
        : `0x${account.address}`;

      console.log('Connected wallet address:', normalizedAddress);
      setWalletAddress(normalizedAddress);
      await loadUserSkillTokens(normalizedAddress);
    } catch (err) {
      console.error('Wallet connection error:', err);
      setError('Failed to connect wallet. Please try again.');
    }
  };

  const checkExistingConnection = async () => {
    try {
      if (typeof window === 'undefined' || !window.petra) {
        console.log('Petra wallet not available');
        return false;
      }

      const isConnected = await window.petra.isConnected();
      console.log('Wallet connection status:', isConnected);

      if (isConnected) {
        const account = await window.petra.account();
        console.log('Account info:', account);

        if (account && account.address) {
          setWalletAddress(account.address);
          await loadUserSkillTokens(account.address);
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error('Connection check error:', err);
      return false;
    }
  };

  const mintSkillToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsMinting(true);
    setError(null);

    try {
      if (typeof window === 'undefined' || !window.petra) {
        throw new Error('Wallet not connected');
      }
      if (!walletAddress) {
        throw new Error('Please connect your wallet first');
      }

      const moduleAddress = process.env.NEXT_PUBLIC_MODULE_ADDRESS;
      if (!moduleAddress) {
        throw new Error('Module address not configured');
      }

      // Create the transaction payload in the correct format
      const payload = {
        type: "entry_function_payload",
        function: `${moduleAddress}::skill_token::mint_skill_token`,
        type_arguments: [],
        arguments: [newSkill.skillName, newSkill.skillLevel]
      };

      console.log('Submitting transaction:', payload);
      const pendingTx = await window.petra.signAndSubmitTransaction(payload);
      console.log('Transaction submitted:', pendingTx);

      // Add proper transaction hash handling
      if (!pendingTx?.hash) {
        throw new Error('No transaction hash received');
      }

      // Wait for transaction with retries
      let attempts = 0;
      const maxAttempts = 10;
      while (attempts < maxAttempts) {
        try {
          await aptos.waitForTransaction({
            transactionHash: pendingTx.hash,
            timeoutSecs: 10,
            checkSuccess: true
          });
          console.log('Transaction confirmed');
          break;
        } catch (waitError) {
          attempts++;
          if (attempts === maxAttempts) {
            throw new Error('Transaction confirmation timed out');
          }
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
        }
      }

      // Get the current account to ensure we're using the correct address
      const account = await window.petra.account();
      if (account?.address) {
        await loadUserSkillTokens(account.address);
      } else {
        throw new Error('Could not get current account address');
      }

      setNewSkill({ skillName: '', skillLevel: 1 });
    } catch (err: any) {
      console.error('Minting error:', err);
      setError(err.message || 'Failed to mint token');
    } finally {
      setIsMinting(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const checkWalletAvailability = async () => {
      setIsCheckingWallet(true);
      try {
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts && mounted) {
          if (typeof window !== 'undefined' && window.petra) {
            setIsWalletAvailable(true);
            const isConnected = await checkExistingConnection();
            if (!isConnected && mounted) {
              setIsCheckingWallet(false);
            }
            return;
          }
          await new Promise(resolve => setTimeout(resolve, 500));
          attempts++;
        }

        if (mounted) {
          setIsWalletAvailable(false);
          setError('Petra wallet not detected. Please install Petra wallet extension.');
        }
      } catch (err) {
        console.error('Wallet detection error:', err);
        if (mounted) {
          setError('Failed to detect wallet status');
          setIsWalletAvailable(false);
        }
      } finally {
        if (mounted) {
          setIsCheckingWallet(false);
        }
      }
    };

    checkWalletAvailability();

    return () => {
      mounted = false;
    };
  }, []);

  const SkillTokenCard = ({ token }: { token: SkillToken }) => (
    <div className="bg-gray-800 rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-blue-400">{token.skillName}</h3>
        <Award className="text-yellow-500" size={24} />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Level</span>
          <span className="text-white font-medium">{token.skillLevel}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Endorsements</span>
          <span className="text-white font-medium">{token.endorsements}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Created</span>
          <span className="text-white font-medium">
            {new Date(Number(token.createdAt)).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );

  if (isCheckingWallet) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="animate-spin text-blue-400 mx-auto" size={32} />
          <p className="text-gray-400">Checking wallet status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6 text-white">
      <nav className="flex justify-between items-center mb-8 pb-4 border-b border-gray-800">
        <div className="flex items-center space-x-2">
          <Award className="text-blue-400" size={32} />
          <h1 className="text-2xl font-bold">Skill Token DApp</h1>
        </div>

        {!walletAddress ? (
          <button
            onClick={connectWallet}
            disabled={!isWalletAvailable}
            className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors"
          >
            <Wallet size={20} />
            <span>{isWalletAvailable ? 'Connect Wallet' : 'Wallet Not Found'}</span>
          </button>
        ) : (
          <div className="flex items-center space-x-2 bg-gray-800 px-4 py-2 rounded-lg">
            <Wallet size={20} className="text-blue-400" />
            <span>{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
          </div>
        )}
      </nav>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!isWalletAvailable && (
        <Alert className="mb-6 bg-yellow-500/10 border-yellow-500/50">
          <AlertDescription>
            Petra wallet is required to use this dApp. Please install the Petra wallet extension and refresh the page.
          </AlertDescription>
        </Alert>
      )}

      {walletAddress && (
        <form onSubmit={mintSkillToken} className="mb-8 bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
            <Award className="text-blue-400" size={24} />
            <span>Mint New Skill Token</span>
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Skill Name</label>
              <input
                type="text"
                value={newSkill.skillName}
                onChange={(e) => setNewSkill({ ...newSkill, skillName: e.target.value })}
                className="w-full bg-gray-700 rounded p-2 text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Skill Level (1-100)</label>
              <input
                type="number"
                min="1"
                max="100"
                value={newSkill.skillLevel}
                onChange={(e) => setNewSkill({ ...newSkill, skillLevel: Number(e.target.value) })}
                className="w-full bg-gray-700 rounded p-2 text-white"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isMinting}
              className="w-full flex items-center justify-center space-x-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 p-2 rounded transition-colors"
            >
              {isMinting ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <Award size={20} />
                  <span>Mint Token</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="animate-spin text-blue-400" size={32} />
        </div>
      ) : skillTokens.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {skillTokens.map((token) => (
            <SkillTokenCard key={token.tokenId} token={token} />
          ))}
        </div>
      ) : walletAddress ? (
        <div className="text-center py-12 text-gray-400">
          No skill tokens found. Mint your first one above!
        </div>
      ) : null}
    </div>
  );
}

export default SkillTokenApp;