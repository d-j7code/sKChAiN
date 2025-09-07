import { WalletSelector } from "./WalletSelector";

export function Header() {
  return (
    <div className="flex items-center justify-between px-6 py-4 max-w-screen-xl mx-auto w-full flex-wrap bg-gray-900/50 backdrop-blur-sm border-b border-gray-800">
      <div className="flex items-center">
        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mr-3">
          <span className="text-lg">⛓️</span>
        </div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          sKChAiN
        </h1>
      </div>

      <div className="flex gap-2 items-center flex-wrap">
        <WalletSelector />
      </div>
    </div>
  );
}
