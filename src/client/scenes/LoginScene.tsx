import React from 'react';

export function LoginScene() {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full relative">
      <div className="absolute inset-0 bg-black/80" />
      <div className="z-10 flex flex-col items-center">
        <div className="loading loading-spinner loading-lg text-primary mb-4" />
        <h2 className="text-2xl text-white">Logging into world server...</h2>
      </div>
    </div>
  );
}
