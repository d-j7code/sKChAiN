import { Header } from "@/components/Header";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useState, useEffect } from 'react';
import { MODULE_ADDRESS } from "./constants";
import { aptosClient } from "./utils/aptosClient";
import { Button } from "./components/ui/button";
import { InputTransactionData } from "@aptos-labs/wallet-adapter-react";
import { Input } from "./components/ui/input";
import { Card } from "./components/ui/card";
import { useToast } from "./components/ui/use-toast";

type Skill = {
  id: number;
  name: string;
  description: string;
  evidenceUrl: string;
  isVerified: boolean;
  validationCount: number;
  owner: string;
};

type Bounty = {
  id: number;
  title: string;
  description: string;
  rewardAmount: number;
  isActive: boolean;
  creator: string;
  assignedTo: string;
};

type UserProfile = {
  reputationScore: number;
  bountiesCompleted: number;
  totalEarned: number;
};

function App() {
  const { connected, account, signAndSubmitTransaction } = useWallet();
  const [activeTab, setActiveTab] = useState<'skills' | 'bounties' | 'validate'>('skills');
  const [skills, setSkills] = useState<Skill[]>([]);
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>({ reputationScore: 0, bountiesCompleted: 0, totalEarned: 0 });
  const [transactionInProgress, setTransactionInProgress] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const { toast } = useToast();

  // Skill form states
  const [skillName, setSkillName] = useState<string>("");
  const [skillDescription, setSkillDescription] = useState<string>("");
  const [evidenceUrl, setEvidenceUrl] = useState<string>("");

  // Bounty form states
  const [bountyTitle, setBountyTitle] = useState<string>("");
  const [bountyDescription, setBountyDescription] = useState<string>("");
  const [rewardAmount, setRewardAmount] = useState<number>(1);

  // Validation states
  const [validateSkillId, setValidateSkillId] = useState<string>("");

  useEffect(() => {
    if (connected && account) {
      fetchData();
    }
  }, [connected, account]);

  const fetchData = async () => {
    if (!connected || !account) return;
    setLoading(true);
    
    try {
      // Get next skill ID
      const result = await aptosClient().view({
        payload: {
          function: `${MODULE_ADDRESS}::skillchain::get_next_ids`,
          functionArguments: []
        }
      });
      const nextSkillId = Number(result[0]);

      // Fetch skills
      const skillsList: Skill[] = [];
      for (let i = 1; i < nextSkillId; i++) {
        try {
          const skillData = await aptosClient().view({
            payload: {
              function: `${MODULE_ADDRESS}::skillchain::get_skill`,
              functionArguments: [i.toString()]
            }
          }) as [string, string, string, boolean, string];
          
          skillsList.push({
            id: i,
            name: skillData[0],
            description: skillData[1],
            evidenceUrl: skillData[2],
            isVerified: skillData[3],
            validationCount: 0, // Not available in simplified contract
            owner: skillData[4]
          });
        } catch (e) {
          console.log(`Skill ${i} not found`);
        }
      }

      setSkills(skillsList);
      setBounties([]); // No bounties in simplified contract
      setUserProfile({ reputationScore: 0, bountiesCompleted: 0, totalEarned: 0 });

    } catch (e) {
      console.log("Error fetching data:", e);
      toast({
        title: "Error",
        description: "Failed to fetch data. Make sure the contract is deployed.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const mintSkill = async () => {
    if (!account || !skillName || !skillDescription || !evidenceUrl) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    setTransactionInProgress(true);
    const transaction: InputTransactionData = {
      data: {
        function: `${MODULE_ADDRESS}::skillchain::mint_skill`,
        functionArguments: [skillName, skillDescription, evidenceUrl]
      },
      options: {
        maxGasAmount: 10000,
        gasUnitPrice: 100
      }
    };

    try {
      const response = await signAndSubmitTransaction(transaction);
      await aptosClient().waitForTransaction({ transactionHash: response.hash });
      
      toast({
        title: "Success!",
        description: "Skill NFT minted successfully"
      });
      
      setSkillName("");
      setSkillDescription("");
      setEvidenceUrl("");
      setTimeout(() => fetchData(), 2000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to mint skill",
        variant: "destructive"
      });
    } finally {
      setTransactionInProgress(false);
    }
  };

  const validateSkill = async () => {
    if (!account || !validateSkillId) {
      toast({
        title: "Missing Information",
        description: "Please enter skill ID",
        variant: "destructive"
      });
      return;
    }

    // Check if user is trying to validate their own skill
    const skillToValidate = skills.find(s => s.id === parseInt(validateSkillId));
    if (skillToValidate && skillToValidate.owner === account.address.toString()) {
      toast({
        title: "Not Allowed",
        description: "You cannot validate your own skills",
        variant: "destructive"
      });
      return;
    }

    setTransactionInProgress(true);
    const transaction: InputTransactionData = {
      data: {
        function: `${MODULE_ADDRESS}::skillchain::validate_skill`,
        functionArguments: [validateSkillId]
      },
      options: {
        maxGasAmount: 10000,
        gasUnitPrice: 100
      }
    };

    try {
      const response = await signAndSubmitTransaction(transaction);
      await aptosClient().waitForTransaction({ transactionHash: response.hash });
      
      toast({
        title: "Success!",
        description: "Skill validated successfully"
      });
      
      setValidateSkillId("");
      setTimeout(() => fetchData(), 2000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to validate skill",
        variant: "destructive"
      });
    } finally {
      setTransactionInProgress(false);
    }
  };

  const createBounty = async () => {
    toast({
      title: "Not Available",
      description: "Bounty creation not implemented in current contract",
      variant: "destructive"
    });
  };

  const truncateAddress = (address: string) => {
    if (!address || address === "0x0") return "None";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!connected) {
    return (
      <>

        <Header />
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
          <div className="container mx-auto px-4 py-16">
            <div className="text-center mb-12">
              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mr-4">
                  <span className="text-3xl">⛓️</span>
                </div>
                <h1 className="text-6xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  sKChAiN
                </h1>
              </div>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                Decentralized Skill Verification & Bounty Platform on Aptos
              </p>
            </div>
            
            <Card className="max-w-md mx-auto p-8 text-center bg-gray-800/50 backdrop-blur-sm border border-gray-700 shadow-2xl">
              <div className="mb-6">
                <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-3xl">🔗</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Connect Your Wallet</h3>
                <p className="text-gray-400">Connect your Aptos wallet to start building your skill portfolio</p>
              </div>
            </Card>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mr-3">
                <span className="text-2xl">⛓️</span>
              </div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                sKChAiN
              </h1>
            </div>
            <p className="text-lg text-gray-300">Decentralized Skill Verification & Bounty Platform</p>
          </div>
          
          <div className="max-w-6xl mx-auto">
            {/* User Profile Card */}
            <Card className="p-6 mb-8 bg-gray-800/50 backdrop-blur-sm border border-gray-700 shadow-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">Your Profile</h3>
                  <p className="text-gray-400 font-mono">{truncateAddress(account?.address?.toString() || "")}</p>
                </div>
                <div className="flex gap-8">
                  <div className="text-center">
                    <p className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">{userProfile.reputationScore}</p>
                    <p className="text-sm text-gray-400">Reputation</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-400">{userProfile.bountiesCompleted}</p>
                    <p className="text-sm text-gray-400">Completed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-400">{userProfile.totalEarned.toFixed(2)}</p>
                    <p className="text-sm text-gray-400">APT Earned</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Navigation Tabs */}
            <div className="flex gap-4 mb-8 p-1 bg-gray-800/50 rounded-xl border border-gray-700">
              <Button 
                onClick={() => setActiveTab('skills')}
                variant={activeTab === 'skills' ? 'default' : 'ghost'}
                className={`px-6 py-3 rounded-lg transition-all ${
                  activeTab === 'skills' 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                🎯 Skills
              </Button>
              <Button 
                onClick={() => setActiveTab('bounties')}
                variant={activeTab === 'bounties' ? 'default' : 'ghost'}
                className={`px-6 py-3 rounded-lg transition-all ${
                  activeTab === 'bounties' 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                💰 Bounties
              </Button>
              <Button 
                onClick={() => setActiveTab('validate')}
                variant={activeTab === 'validate' ? 'default' : 'ghost'}
                className={`px-6 py-3 rounded-lg transition-all ${
                  activeTab === 'validate' 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                ✅ Validate
              </Button>
            </div>

            {/* Skills Tab */}
            {activeTab === 'skills' && (
              <div className="space-y-8">
                {/* Mint Skill Section */}
                <Card className="p-8 bg-gray-800/50 backdrop-blur-sm border border-gray-700 shadow-2xl">
                  <div className="flex items-center mb-6">
                    <div className="w-4 h-10 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full mr-4"></div>
                    <h2 className="text-3xl font-bold text-white">Mint Skill NFT</h2>
                    <span className="ml-auto bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 px-4 py-2 rounded-full text-sm font-medium border border-purple-500/30">
                      ⚡ 0.1 APT Fee
                    </span>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <Input
                        placeholder="Skill Name (e.g., React Developer)"
                        value={skillName}
                        onChange={(e) => setSkillName(e.target.value)}
                        className="h-12 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500"
                      />
                      <Input
                        placeholder="Description"
                        value={skillDescription}
                        onChange={(e) => setSkillDescription(e.target.value)}
                        className="h-12 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500"
                      />
                      <Input
                        placeholder="Evidence URL (GitHub, Portfolio, etc.)"
                        value={evidenceUrl}
                        onChange={(e) => setEvidenceUrl(e.target.value)}
                        className="h-12 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500"
                      />
                    </div>
                    <div className="flex items-center justify-center">
                      <Button 
                        onClick={mintSkill} 
                        disabled={transactionInProgress}
                        className="h-14 px-8 text-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-xl shadow-lg transition-all transform hover:scale-105"
                      >
                        {transactionInProgress ? "⏳ Minting..." : "🚀 Mint Skill"}
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Skills List */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-3xl font-bold text-white">All Skills</h2>
                    <Button 
                      onClick={fetchData} 
                      disabled={loading}
                      variant="outline"
                      className="h-10 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                    >
                      {loading ? "🔄 Loading..." : "🔄 Refresh"}
                    </Button>
                  </div>
                  
                  {loading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
                      <p className="text-gray-400 mt-4">Loading skills...</p>
                    </div>
                  ) : skills.length === 0 ? (
                    <Card className="p-12 text-center bg-gray-800/50 backdrop-blur-sm border border-gray-700 shadow-2xl">
                      <div className="w-16 h-16 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">🎯</span>
                      </div>
                      <p className="text-xl text-gray-300">No skills found</p>
                      <p className="text-gray-500 mt-2">Mint your first skill to get started</p>
                    </Card>
                  ) : (
                    <div className="grid gap-4">
                      {skills.map((skill) => (
                        <Card key={skill.id} className="p-6 bg-gray-800/50 backdrop-blur-sm border border-gray-700 shadow-xl hover:shadow-2xl transition-all">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-xl font-bold text-white">{skill.name}</h3>
                                {skill.isVerified ? (
                                  <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm border border-green-500/30">✓ Verified</span>
                                ) : (
                                  <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-sm border border-yellow-500/30">⏳ Pending</span>
                                )}
                              </div>
                              <p className="text-gray-300 mb-3">{skill.description}</p>
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span className="bg-gray-700/50 px-2 py-1 rounded">ID: {skill.id}</span>
                                <span className="bg-gray-700/50 px-2 py-1 rounded font-mono">Owner: {truncateAddress(skill.owner)}</span>
                                <span className="bg-gray-700/50 px-2 py-1 rounded">Validations: {skill.validationCount}</span>
                              </div>
                            </div>
                            <a 
                              href={skill.evidenceUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-purple-400 hover:text-purple-300 text-sm font-medium bg-purple-500/10 px-3 py-2 rounded-lg border border-purple-500/30 hover:bg-purple-500/20 transition-all"
                            >
                              View Evidence →
                            </a>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bounties Tab */}
            {activeTab === 'bounties' && (
              <div className="space-y-8">
                {/* Create Bounty Section */}
                <Card className="p-8 bg-gray-800/50 backdrop-blur-sm border border-gray-700 shadow-2xl">
                  <div className="flex items-center mb-6">
                    <div className="w-4 h-10 bg-gradient-to-b from-green-500 to-emerald-500 rounded-full mr-4"></div>
                    <h2 className="text-3xl font-bold text-white">Create Bounty</h2>
                    <span className="ml-auto bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 px-4 py-2 rounded-full text-sm font-medium border border-green-500/30">
                      💰 Coming Soon
                    </span>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <Input
                        placeholder="Bounty Title"
                        value={bountyTitle}
                        onChange={(e) => setBountyTitle(e.target.value)}
                        className="h-12"
                      />
                      <Input
                        placeholder="Description"
                        value={bountyDescription}
                        onChange={(e) => setBountyDescription(e.target.value)}
                        className="h-12"
                      />
                      <Input
                        type="number"
                        placeholder="Reward Amount (APT)"
                        value={rewardAmount}
                        onChange={(e) => setRewardAmount(Number(e.target.value))}
                        className="h-12"
                        step="0.1"
                        min="0.1"
                      />
                    </div>
                    <div className="flex items-center justify-center">
                      <Button 
                        onClick={createBounty} 
                        disabled={transactionInProgress}
                        className="h-14 px-8 text-lg bg-green-600 hover:bg-green-700"
                      >
                        {transactionInProgress ? "Creating..." : "Create Bounty"}
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Bounties List */}
                <div>
                  <h2 className="text-3xl font-bold text-white mb-6">Active Bounties</h2>
                  {bounties.filter(b => b.isActive).length === 0 ? (
                    <Card className="p-12 text-center bg-gray-800/50 backdrop-blur-sm border border-gray-700 shadow-2xl">
                      <div className="w-16 h-16 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">💰</span>
                      </div>
                      <p className="text-xl text-gray-300">No active bounties</p>
                      <p className="text-gray-500 mt-2">Feature coming soon</p>
                    </Card>
                  ) : (
                    <div className="grid gap-4">
                      {bounties.filter(b => b.isActive).map((bounty) => (
                        <Card key={bounty.id} className="p-6 bg-white shadow-lg border-0">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="text-xl font-bold text-gray-800 mb-2">{bounty.title}</h3>
                              <p className="text-gray-600 mb-3">{bounty.description}</p>
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span>ID: {bounty.id}</span>
                                <span>Creator: {truncateAddress(bounty.creator)}</span>
                                {bounty.assignedTo !== "0x0" && (
                                  <span>Assigned to: {truncateAddress(bounty.assignedTo)}</span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-green-600">{(bounty.rewardAmount / 100000000).toFixed(2)} APT</p>
                              <p className="text-sm text-gray-500">Reward</p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Validate Tab */}
            {activeTab === 'validate' && (
              <Card className="p-8 bg-gray-800/50 backdrop-blur-sm border border-gray-700 shadow-2xl">
                <div className="flex items-center mb-6">
                  <div className="w-4 h-10 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full mr-4"></div>
                  <h2 className="text-3xl font-bold text-white">Validate Skills</h2>
                  <span className="ml-auto bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-300 px-4 py-2 rounded-full text-sm font-medium border border-blue-500/30">
                    ✅ Peer Validation
                  </span>
                </div>
                
                <div className="max-w-md space-y-4">
                  <Input
                    placeholder="Enter Skill ID to validate"
                    value={validateSkillId}
                    onChange={(e) => setValidateSkillId(e.target.value)}
                    className="h-12 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                  />
                  <Button 
                    onClick={validateSkill} 
                    disabled={transactionInProgress}
                    className="w-full h-12 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg transition-all transform hover:scale-105"
                  >
                    {transactionInProgress ? "⏳ Validating..." : "✅ Validate Skill"}
                  </Button>
                  <p className="text-sm text-gray-400 text-center">
                    💡 Note: You cannot validate your own skills
                  </p>
                </div>
                
                <div className="mt-8">
                  <h3 className="text-xl font-bold text-white mb-4">Unverified Skills</h3>
                  {skills.filter(s => !s.isVerified).length === 0 ? (
                    <p className="text-gray-400">No unverified skills found</p>
                  ) : (
                    <div className="grid gap-4">
                      {skills.filter(s => !s.isVerified).map((skill) => (
                        <Card key={skill.id} className="p-4 bg-gray-700/30 border border-gray-600">
                          <div className="flex justify-between items-center">
                            <div>
                              <h4 className="font-bold text-white">{skill.name}</h4>
                              <p className="text-sm text-gray-400 font-mono">ID: {skill.id} | Owner: {truncateAddress(skill.owner)}</p>
                            </div>
                            <a 
                              href={skill.evidenceUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 text-sm font-medium bg-blue-500/10 px-3 py-2 rounded-lg border border-blue-500/30 hover:bg-blue-500/20 transition-all"
                            >
                              Review Evidence →
                            </a>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default App;