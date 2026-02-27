export default function WordQuizPopup({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={onClose}>
      <div className="bg-white w-full max-w-md mx-auto p-6 rounded-t-2xl">
        <p className="text-gray-800">Quiz popup — coming in next task</p>
        <button onClick={onClose} className="mt-4 text-blue-600 font-medium">Close</button>
      </div>
    </div>
  )
}
