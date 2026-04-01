export default function NotFound() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingBottom: '60px',
      }}
    >
      {/* Full-screen background image */}
      <img
        src="https://www.thehandbook.com/cdn-cgi/image/width=600,height=600,fit=cover,q=80,format=webp/https://files.thehandbook.com/uploads/2021/04/aauvwnjolbx8fc5d79anvd-6q19de17tl2u3cnpwy1npzas800-c-k-c0x00ffffff-no-rj.jpg"
        alt="404"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          zIndex: 0,
        }}
      />
      {/* Dark overlay for text readability */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(0,47,52,0.92) 0%, rgba(0,47,52,0.3) 50%, transparent 100%)',
          zIndex: 1,
        }}
      />
      {/* Text + button overlay */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          fontFamily: 'Cairo, sans-serif',
          direction: 'rtl',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            color: '#ffffff',
            fontSize: '72px',
            fontWeight: '800',
            margin: '0 0 8px 0',
            textShadow: '0 2px 16px rgba(0,0,0,0.6)',
            lineHeight: 1,
          }}
        >
          404
        </h1>
        <p
          style={{
            color: '#ffffffdd',
            fontSize: '22px',
            marginBottom: '28px',
            textShadow: '0 1px 8px rgba(0,0,0,0.5)',
          }}
        >
          الصفحة غير موجودة
        </p>
        <a
          href="/"
          style={{
            background: '#ffffff',
            color: '#002f34',
            padding: '14px 40px',
            borderRadius: '14px',
            fontWeight: '700',
            fontSize: '17px',
            textDecoration: 'none',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}
        >
          العودة للرئيسية
        </a>
      </div>
    </div>
  );
}
