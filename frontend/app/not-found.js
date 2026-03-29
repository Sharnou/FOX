export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#002f34',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Cairo, sans-serif',
        direction: 'rtl',
        padding: '20px',
        textAlign: 'center',
      }}
    >
      <img
        src="https://www.thehandbook.com/cdn-cgi/image/width=600,height=600,fit=cover,q=80,format=webp/https://files.thehandbook.com/uploads/2021/04/aauvwnjolbx8fc5d79anvd-6q19de17tl2u3cnpwy1npzas800-c-k-c0x00ffffff-no-rj.jpg"
        alt="404"
        style={{
          width: '280px',
          height: '280px',
          borderRadius: '50%',
          objectFit: 'cover',
          border: '4px solid #ffffff22',
          marginBottom: '28px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
      />
      <h1
        style={{
          color: '#ffffff',
          fontSize: '28px',
          fontWeight: '700',
          marginBottom: '8px',
        }}
      >
        404
      </h1>
      <p
        style={{
          color: '#ffffffcc',
          fontSize: '18px',
          marginBottom: '32px',
        }}
      >
        الصفحة غير موجودة
      </p>
      <a
        href="/"
        style={{
          background: '#ffffff',
          color: '#002f34',
          padding: '12px 32px',
          borderRadius: '12px',
          fontWeight: '700',
          fontSize: '16px',
          textDecoration: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        }}
      >
        العودة للرئيسية
      </a>
    </div>
  );
}
