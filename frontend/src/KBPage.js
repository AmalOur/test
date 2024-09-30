import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Trash2, RefreshCw, Search, Menu, X, ChevronDown, ChevronRight, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaDatabase} from 'react-icons/fa';

const Button = ({ children, onClick, className, ...props }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 ${className}`}
    {...props}
  >
    {children}
  </button>
);

const SidebarItem = ({ icon: Icon, text, onClick, isActive }) => (
  <button
    className={`flex items-center w-full px-4 py-3 mb-2 rounded-lg transition-colors duration-200 ${
      isActive ? 'bg-orange-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
    }`}
    onClick={onClick}
  >
    <Icon size={20} className="mr-2" /> {/* Increased icon size for better visibility */}
    <span className="text-sm font-medium">{text}</span>
  </button>
);

const Sidebar = ({ activeTable, onTableChange, isMobile, onClose, onReturnToChat }) => {
  const tables = ['langchain_pg_collection', 'langchain_pg_embedding'];
  
  return (
    <div className={`bg-gray-800 text-white ${isMobile ? 'fixed inset-0 z-50' : 'w-70 min-h-screen'}`}>
      <div className="p-6">
        {isMobile && (
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        )}
        <h2 className="text-2xl font-semibold mb-6">Tables</h2>
        <nav className="space-y-2">
          {tables.map(table => (
            <SidebarItem
              key={table}
              icon={FaDatabase}
              text={table}
              onClick={() => {
                onTableChange(table);
                if (isMobile) onClose();
              }}
              isActive={activeTable === table}
            />
          ))}
        </nav>
        <div className="mt-6">
          <SidebarItem
            icon={MessageCircle}
            text="Return to Chat"
            onClick={onReturnToChat}
          />
        </div>
      </div>
    </div>
  );
};

const TableView = ({ data, onDelete, onRefresh, tableType }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRows, setExpandedRows] = useState({});
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [collectionIds, setCollectionIds] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (tableType === 'langchain_pg_embedding') {
      // Extract unique collection_ids from data
      const uniqueCollectionIds = [...new Set(data.map(row => row.collection_id))];
      setCollectionIds(uniqueCollectionIds);
    }
  }, [data, tableType]);

  const filteredData = tableType === 'langchain_pg_embedding'
    ? data
        .filter(row =>
          (!selectedCollectionId || row.collection_id === selectedCollectionId) &&
          Object.values(row).some(value =>
            String(value).toLowerCase().includes(searchTerm.toLowerCase())
          )
        )
        .reduce((acc, row) => {
          if (!acc[row.collection_id]) {
            acc[row.collection_id] = [];
          }
          acc[row.collection_id].push(row);
          return acc;
        }, {})
    : data.filter(row =>
        Object.values(row).some(value =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );

  const toggleRowExpansion = (index) => {
    setExpandedRows(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (id) => {
    setSelectedCollectionId(id);
    setIsOpen(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 sm:flex justify-between items-center border-b border-gray-200">
        <div className="flex-grow max-w-md mb-4 sm:mb-0">
          <div className="relative max-w-md mx-auto">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 pl-10 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition duration-300 ease-in-out"
            />
            <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
        </div>
        {tableType === 'langchain_pg_embedding' && (
          <div className="flex space-x-4 items-center mt-4 sm:mt-0">
              <div className="relative inline-block" ref={dropdownRef}>
                <button
                  onClick={() => setIsOpen(!isOpen)}
                  className="bg-white text-gray-800 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition duration-300 ease-in-out hover:bg-gray-100 flex items-center justify-between min-w-[200px]"
                >
                  <span className="truncate mr-4">
                    {selectedCollectionId || 'All Collection IDs'}
                  </span>
                  <ChevronDown 
                    size={18} 
                    className={`transition-transform duration-300 ${isOpen ? 'transform rotate-180' : ''}`}
                  />
                </button>
                {isOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    <ul className="py-1">
                      <li 
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer transition-colors duration-150 ease-in-out text-gray-800"
                        onClick={() => handleSelect('')}
                      >
                        All Collection IDs
                      </li>
                      {collectionIds.map(id => (
                        <li 
                          key={id} 
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer transition-colors duration-150 ease-in-out text-gray-800 truncate"
                          onClick={() => handleSelect(id)}
                        >
                          {id}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            <Button onClick={onRefresh} className="bg-orange-100 hover:bg-orange-200 text-orange-600">
              <RefreshCw size={20} className="mr-2" />
            </Button>
          </div>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {tableType === 'langchain_pg_embedding' && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expand
                </th>
              )}
              {data.length > 0 && Object.keys(data[0]).map((header) => (
                <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {header}
                </th>
              ))}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Delete
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tableType === 'langchain_pg_embedding'
              ? Object.entries(filteredData).map(([collectionId, rows], index) => (
                  <React.Fragment key={collectionId}>
                    {rows.map((row, rowIndex) => (
                      <React.Fragment key={rowIndex}>
                        <tr className={`${expandedRows[rowIndex] ? 'bg-orange-50' : 'hover:bg-gray-50'} transition-colors`}>
                          {tableType === 'langchain_pg_embedding' && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() => toggleRowExpansion(rowIndex)}
                                className="text-orange-600 hover:text-orange-900"
                              >
                                {expandedRows[rowIndex] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                              </button>
                            </td>
                          )}
                          {Object.entries(row).map(([key, value]) => (
                            <td key={key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="truncate max-w-xs" title={String(value)}>
                                {value === null ? 'None' : String(value)}
                              </div>
                            </td>
                          ))}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => onDelete(row.uuid)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 size={20} />
                            </button>
                          </td>
                        </tr>
                        {expandedRows[rowIndex] && tableType === 'langchain_pg_embedding' && (
                          <tr>
                            <td colSpan={Object.keys(row).length + (tableType === 'langchain_pg_embedding' ? 1 : 0)} className="px-6 py-4">
                              <div className="bg-white p-3 rounded shadow-sm max-w-full">
                                <span className="font-medium text-gray-700 block mb-1">Document</span>
                                <span className="text-gray-900 break-words">
                                  {row.document === null ? 'None' : String(row.document)}
                                </span>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </React.Fragment>
                ))
              : data.map((row, rowIndex) => (
                  <React.Fragment key={rowIndex}>
                    <tr className={`${expandedRows[rowIndex] ? 'bg-orange-50' : 'hover:bg-gray-50'} transition-colors`}>
                      {tableType === 'langchain_pg_embedding' && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => toggleRowExpansion(rowIndex)}
                            className="text-orange-600 hover:text-orange-900"
                          >
                            {expandedRows[rowIndex] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                          </button>
                        </td>
                      )}
                      {Object.entries(row).map(([key, value]) => (
                        <td key={key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="truncate max-w-xs" title={String(value)}>
                            {value === null ? 'None' : String(value)}
                          </div>
                        </td>
                      ))}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => onDelete(row.uuid)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 size={20} />
                        </button>
                      </td>
                    </tr>
                    {expandedRows[rowIndex] && tableType === 'langchain_pg_embedding' && (
                      <tr>
                        <td colSpan={Object.keys(row).length + (tableType === 'langchain_pg_embedding' ? 1 : 0)} className="px-6 py-4">
                          <div className="bg-white p-3 rounded shadow-sm max-w-full">
                            <span className="font-medium text-gray-700 block mb-1">Document</span>
                            <span className="text-gray-900 break-words">
                              {row.document === null ? 'None' : String(row.document)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};



const KnowledgeBasePage = () => {
  const [selectedTable, setSelectedTable] = useState('langchain_pg_collection');
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const navigate = useNavigate();

  const fetchTableData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/api/knowledge_base/${selectedTable}`);
      setTableData(response.data);
    } catch (error) {
      setError('Error fetching table data. Please try again.');
      console.error('Error fetching table data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTableData();
  }, [selectedTable]);

  const handleDeleteRecord = async (uuid) => {
    try {
      await axios.post(process.env.REACT_APP_API_BASE_URL + '/api/knowledge_base/delete', {
        table: selectedTable,
        uuid: uuid
      });
      fetchTableData();
    } catch (error) {
      setError('Error deleting record. Please try again.');
      console.error('Error deleting record:', error);
    }
  };

  const handleReturnToChat = () => {
    navigate('/chat');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed left-0 top-0 h-full z-30"
          >
            <Sidebar
              activeTable={selectedTable}
              onTableChange={setSelectedTable}
              isMobile={false}
              onClose={() => setIsSidebarOpen(false)}
              onReturnToChat={handleReturnToChat}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <div className={`flex-1 flex flex-col overflow-hidden ${isSidebarOpen ? 'md:ml-64' : ''}`}>
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
            <div className="flex items-center">
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="mr-4 text-gray-500 hover:text-gray-700">
                <Menu size={24} />
              </button>
              <h1 className="text-2xl font-bold text-gray-800">Knowledge Base Management</h1>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100">
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            {error && (
              <div className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
                <p className="font-bold">Error</p>
                <p>{error}</p>
              </div>
            )}
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
              </div>
            ) : tableData.length > 0 ? (
              <TableView 
                data={tableData} 
                onDelete={handleDeleteRecord}
                onRefresh={fetchTableData}
                tableType={selectedTable}
              />
            ) : (
              <p className="text-gray-600 text-center">No data available for this table.</p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default KnowledgeBasePage;